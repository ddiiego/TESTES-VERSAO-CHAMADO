import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, Star, MessageCircle, Send, CornerDownRight, 
  CheckCheck, Check, UserPlus, Info, FileText, Edit3, Reply, CornerUpLeft,
  PlusCircle, Monitor, Plus, RotateCcw, Maximize2,
  Loader2, X, Ticket, Clock, User, Building, MapPin, AlertCircle, Trash2, Upload, BookOpen, Trophy
} from 'lucide-react';
import * as ExcelJS from 'exceljs';
import api from '../../api';
import { supabase } from '../../supabase';
import ExcelTableRenderer from '../../components/ExcelTableRenderer';
import { formatDate, getTipoLabel, getTipoTextColor, getStatusLabel, getStatusColor } from '../../utils/formatters';
import styles from './styles.module.css';
import { ListaChamadosProps, Chamado, ChatMessage, ExcelData, TecnicoSimplificado } from './types';

// Polyfills básicos
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}
if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = { isBuffer: () => false };
}
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

export default function ListaChamados({ tipo }: ListaChamadosProps) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [showConcluirModal, setShowConcluirModal] = useState(false);
  const [isEditingField, setIsEditingField] = useState<'problema' | 'solucao' | null>(null);
  const [tempEditValue, setTempEditValue] = useState('');
  const [showValidarModal, setShowValidarModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatNaoVistos, setChatNaoVistos] = useState(0);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [problema, setProblema] = useState('');
  const [solucao, setSolucao] = useState('');
  const [nota, setNota] = useState<number | null>(null);
  const [observacao, setObservacao] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [tecnicos, setTecnicos] = useState<TecnicoSimplificado[]>([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState('');
  const [showAjudaModal, setShowAjudaModal] = useState(false);

  // Estados para Novo Chamado
  const [showNovoChamado, setShowNovoChamado] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoLocalSuporte, setNovoLocalSuporte] = useState('');
  const [novoMensagem, setNovoMensagem] = useState('');
  const [novoErro, setNovoErro] = useState('');
  
  // Estados para Edição de Relato
  const [tempRelato, setTempRelato] = useState('');
  const [tempTitulo, setTempTitulo] = useState('');
  const [isEditingRelato, setIsEditingRelato] = useState(false);
  const [tempExcelData, setTempExcelData] = useState<ExcelData | null>(null);
  const [globalExcelScale, setGlobalExcelScale] = useState(() => {
    const saved = localStorage.getItem('excel-table-scale');
    if (!saved) return 1.0;
    const parsed = parseFloat(saved);
    return isNaN(parsed) ? 1.0 : parsed;
  });

  useEffect(() => {
    localStorage.setItem('excel-table-scale', globalExcelScale.toString());
  }, [globalExcelScale]);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const notifHandledRef = useRef(false);
  const isAdmin = localStorage.getItem('userRole') === 'admin';
  const isProvas = tipo === 'provas';
  const isTecnico = localStorage.getItem('userRole') === 'tecnico';
  const currentUser = localStorage.getItem('nomeCompleto');
  const username = localStorage.getItem('username');
  
  const podeEditarChamado = (chamado: Chamado) => {
    if (isAdmin) return true;
    if (chamado.tecnico_atendimento === username) return true;
    if (chamado.tecnicos_adicionais?.includes(username ?? '')) return true;
    return false;
  };

  const fetchChatNaoVistos = async () => {
    if (!selectedChamado) return;
    try {
      const res = await api.get(`/chamados/${selectedChamado.id}/chat/nao-vistos`);
      setChatNaoVistos(res.data.count || 0);
    } catch {
      setChatNaoVistos(0);
    }
  };

  const openChat = () => {
    if (!selectedChamado?.id) return;
    setShowChat(true);
    setChatLoading(true);
    
    // Marcar como visto ao abrir
    api.patch(`/chamados/${selectedChamado.id}/chat/visto`).catch(() => {});

    api.get(`/chamados/${selectedChamado.id}/chat`)
      .then(res => {
        setChatMessages(res.data.messages || []);
        setTimeout(() => {
          const c = document.getElementById('chat-container');
          if (c) c.scrollTop = c.scrollHeight;
        }, 100);
      })
      .catch(err => console.error('Erro ao carregar chat:', err))
      .finally(() => setChatLoading(false));
  };

  // Efeito para Realtime do Chat
  useEffect(() => {
    if (!showChat || !selectedChamado) return;

    const channel = supabase
      .channel(`chat-${selectedChamado.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_mensagens',
        filter: `chamado_id=eq.${selectedChamado.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setChatMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
          setTimeout(() => {
            const c = document.getElementById('chat-container');
            if (c) c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
          }, 100);
        } else if (payload.eventType === 'UPDATE') {
          setChatMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        } else if (payload.eventType === 'DELETE') {
          setChatMessages(prev => prev.filter(m => m.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showChat, selectedChamado]);

  const fetchChamados = () => {
    const alertaFiltro = isProvas ? 'Provas' : 'Suporte TI';
    api.get(`/chamados?alerta=${alertaFiltro}`)
      .then((res) => {
        let data = res.data || [];
        let filtered = data;
        filtered = isAdmin 
          ? filtered.filter((c: any) => c.status !== 'fechado')
          : filtered.filter((c: any) => c.status !== 'fechado' && c.status !== 'concluido');
        setChamados(filtered);
        setSelectedChamado(prev => {
          if (!prev) return null;
          const updated = filtered.find((c: any) => c.id === prev.id);
          return updated || prev;
        });
      })
      .catch(() => setChamados([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (loading || notifHandledRef.current) return;
    const chamadoId = searchParams.get('chamado_id');
    const action = searchParams.get('action');
    const openNew = searchParams.get('open_new');
    if (openNew === 'true') {
      notifHandledRef.current = true;
      setShowNovoChamado(true);
      setSearchParams({}, { replace: true });
      return;
    }
    if (chamadoId && chamados.length > 0) {
      const chamado = chamados.find(c => String(c.id) === chamadoId);
      if (chamado) {
        notifHandledRef.current = true;
        setSelectedChamado(chamado);
        if (action === 'chat') openChat();
        setSearchParams({}, { replace: true });
      }
    }
  }, [chamados, loading, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedChamado) fetchChatNaoVistos();
  }, [selectedChamado]);

  useEffect(() => {
    fetchChamados();
    const channel = supabase.channel('chamados-status').on('postgres_changes', { event: '*', schema: 'public', table: 'logs_chamados' }, () => { fetchChamados(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isProvas, tipo]);

  const handleAtender = async (chamado: Chamado) => {
    setActionLoading(true);
    try { await api.patch(`/chamados/${chamado.id}/atender`); fetchChamados(); setSelectedChamado(null); }
    catch (err) { console.error('Erro ao atender:', err); }
    finally { setActionLoading(false); }
  };

  const handleDiagnostico = async () => {
    if (!problema || !selectedChamado) return;
    setActionLoading(true);
    try {
      await api.patch(`/chamados/${selectedChamado.id}/diagnostico`, { problema });
      setShowConcluirModal(false);
      fetchChamados();
      setProblema('');
    } catch (err) { console.error('Erro ao salvar diagnóstico:', err); }
    finally { setActionLoading(false); }
  };

  const handleConcluir = async () => {
    if (!solucao || !selectedChamado) return;
    setActionLoading(true);
    try {
      await api.patch(`/chamados/${selectedChamado.id}/concluir`, { problema: problema || selectedChamado.problema_encontrado, solucao });
      setShowConcluirModal(false);
      setProblema('');
      setSolucao('');
      fetchChamados();
      setSelectedChamado(null);
    } catch (err) { console.error('Erro ao concluir:', err); }
    finally { setActionLoading(false); }
  };

  const handleUpdateField = async () => {
    if (!selectedChamado || !isEditingField) return;
    setActionLoading(true);
    try {
      const payload = isEditingField === 'problema' 
        ? { problema: tempEditValue, solucao: selectedChamado.solucao_aplicada }
        : { problema: selectedChamado.problema_encontrado, solucao: tempEditValue };
      await api.patch(`/chamados/${selectedChamado.id}/atualizar-solucao`, payload);
      setIsEditingField(null);
      fetchChamados();
    } catch (err) { console.error('Erro ao atualizar campo:', err); }
    finally { setActionLoading(false); }
  };

  const handleValidar = async (aprovado: boolean) => {
    if (!nota) { alert('Por favor, selecione uma nota.'); return; }
    setActionLoading(true);
    try {
      await api.patch(`/chamados/${selectedChamado?.id}/validar`, { nota, aprovado, observacao: observacao || null });
      setShowValidarModal(false);
      setNota(null);
      setObservacao('');
      fetchChamados();
      if (!isAdmin) { setSelectedChamado(null); navigate('/fechados'); }
    } catch (err) { console.error('Erro ao validar:', err); }
    finally { setActionLoading(false); }
  };

  const handleValidarAdmin = async () => {
    if (!confirm('Fechar este chamado?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/chamados/${selectedChamado?.id}/validar`, { nota: selectedChamado?.nota_validacao || 6, aprovado: true });
      fetchChamados(); setSelectedChamado(null); navigate('/fechados');
    } catch (err) { console.error('Erro ao fechar:', err); }
    finally { setActionLoading(false); }
  };

  const handleReabrir = async (chamado: Chamado) => {
    if (!confirm('Reabrir este chamado?')) return;
    setActionLoading(true);
    try { await api.patch(`/chamados/${chamado.id}/reabrir`); fetchChamados(); setSelectedChamado(null); }
    catch (err) { console.error('Erro ao reabrir:', err); }
    finally { setActionLoading(false); }
  };

  const fetchTecnicos = () => {
    api.get('/tecnicos').then((res) => setTecnicos((res.data || []).filter((t: any) => t.username !== username))).catch(() => {});
  };

  const handlePedirAjuda = async () => {
    if (!tecnicoSelecionado) return;
    setActionLoading(true);
    try { await api.patch(`/chamados/${selectedChamado?.id}/pedir-ajuda`, { novoTecnico: tecnicoSelecionado }); setShowAjudaModal(false); setTecnicoSelecionado(''); fetchChamados(); setSelectedChamado(null); }
    catch (err) { console.error('Erro ao pedir ajuda:', err); }
    finally { setActionLoading(false); }
  };

  const handleExcluir = async (chamado: Chamado) => {
    if (!confirm('EXCLUIR este chamado?')) return;
    setActionLoading(true);
    try { await api.delete(`/chamados/${chamado.id}`); fetchChamados(); setSelectedChamado(null); }
    catch (err) { console.error('Erro ao excluir:', err); }
    finally { setActionLoading(false); }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImportLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const tables: any[] = [];
      workbook.eachSheet((worksheet: ExcelJS.Worksheet) => {
        const rows: any[] = [];
        const dimensions = worksheet.dimensions;
        if (!dimensions) return;

        // Itera apenas sobre o range que contém dados
        for (let r = dimensions.top; r <= dimensions.bottom; r++) {
          const row = worksheet.getRow(r);
          const cells: any[] = [];
          let hasData = false;

          for (let c = dimensions.left; c <= dimensions.right; c++) {
            const cell = row.getCell(c);
            let v = cell.value;
            if (v && typeof v === 'object') {
              if ((v as any).richText) v = (v as any).richText.map((rt: any) => rt.text).join('');
              else if ((v as any).result !== undefined) v = (v as any).result;
              else if ((v as any).text) v = (v as any).text;
            }
            
            const val = v?.toString() || '';
            if (val.trim()) hasData = true;

            cells.push({ 
              v: val, 
              bg: cell.fill?.type === 'pattern' ? '#' + (cell.fill as any).fgColor?.argb?.substring(2) : undefined,
              c: cell.font?.color?.argb ? '#' + (cell.font.color.argb as string).substring(2) : undefined,
              b: !!cell.font?.bold,
              s: cell.font?.size || 11,
              w: worksheet.getColumn(c).width ? worksheet.getColumn(c).width * 8 : undefined, // Aprox pixels
              h: row.height ? row.height * 1.5 : undefined, // Aprox pixels
              cs: 1, 
              rs: 1 
            });
          }
          // Adiciona a linha se houver dados ou se for uma linha intermediária
          if (hasData || rows.length > 0) {
            rows.push({ cells });
          }
        }
        
        // Remove linhas vazias do final
        while (rows.length > 0 && rows[rows.length - 1].cells.every((c: any) => !c.v.trim())) {
          rows.pop();
        }

        if (rows.length > 0) {
          tables.push({ name: worksheet.name, rows });
        }
      });
      const data = { __isExcel: true, tables };
      if (isEditingRelato) setTempExcelData(data); else { setExcelData(data); if (tables[0].rows[0].cells[0]?.v) setNovoTitulo(tables[0].rows[0].cells[0].v); }
    } catch (err) { console.error('Erro Excel:', err); }
    finally { setImportLoading(false); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isProvas) return;
    const html = e.clipboardData.getData('text/html'); if (!html) return;
    const parser = new DOMParser(); const doc = parser.parseFromString(html, 'text/html'); const table = doc.querySelector('table'); if (!table) return;
    const rows: any[] = [];
    table.querySelectorAll('tr').forEach((tr) => {
      const cells: any[] = [];
      tr.querySelectorAll('td, th').forEach((td: any) => { 
        cells.push({ 
          v: td.innerText.trim(), 
          bg: td.style.backgroundColor || undefined, 
          c: td.style.color || undefined,
          b: td.style.fontWeight === 'bold' || td.style.fontWeight > 500 || td.tagName === 'TH',
          s: parseInt(td.style.fontSize) || 11,
          cs: td.colSpan || 1, 
          rs: td.rowSpan || 1 
        }); 
      }); 
      if (cells.length > 0) rows.push({ cells });
    });
    if (rows.length > 0) {
      const data = { __isExcel: true, tables: [{ name: 'Colado', rows }] };
      if (isEditingRelato) setTempExcelData(data); else { setExcelData(data); if (rows[0].cells[0]?.v) setNovoTitulo(rows[0].cells[0].v); }
    }
  };

  const handleCellChange = (tableIdx: number, rowIdx: number, cellIdx: number, value: string) => {
    if (isEditingRelato && tempExcelData) {
      const newData = JSON.parse(JSON.stringify(tempExcelData)); // Deep clone simple
      newData.tables[tableIdx].rows[rowIdx].cells[cellIdx].v = value;
      setTempExcelData(newData);
    } else if (excelData) {
      const newData = JSON.parse(JSON.stringify(excelData));
      newData.tables[tableIdx].rows[rowIdx].cells[cellIdx].v = value;
      setExcelData(newData);
    }
  };

  const handleEnviarNovoChamado = async () => {
    if (!novoTitulo.trim() || !novoLocalSuporte.trim()) { setNovoErro('Preencha os campos obrigatórios.'); return; }
    setActionLoading(true);
    try {
      const userSetorId = localStorage.getItem('setorId');
      await api.post('/chamados/enviar', { 
        alerta: isProvas ? 'Provas' : 'Suporte TI', 
        mensagem: novoTitulo, 
        descricao: excelData ? JSON.stringify({ ...excelData, caption: novoMensagem }) : novoMensagem, 
        nome_solicitante: currentUser, 
        local_suporte: novoLocalSuporte,
        setor_id: userSetorId || null
      });
      setShowNovoChamado(false); setExcelData(null); setNovoTitulo(''); setNovoLocalSuporte(''); setNovoMensagem(''); fetchChamados();
    } catch (err) { setNovoErro('Erro ao enviar.'); }
    finally { setActionLoading(false); }
  };

  const handleUpdateRelato = async () => {
    if (!selectedChamado) return;
    setActionLoading(true);
    try {
      const finalDesc = tempExcelData ? JSON.stringify({ ...tempExcelData, caption: tempRelato }) : tempRelato;
      await api.patch(`/chamados/${selectedChamado.id}/editar-relato`, { mensagem: tempTitulo, descricao: finalDesc });
      setIsEditingRelato(false); fetchChamados();
    } catch (err) { alert('Erro ao atualizar relato'); }
    finally { setActionLoading(false); }
  };

  const startEditing = (msg: any) => { setEditingMessage(msg); setChatMessage(msg.mensagem); };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    setChatLoading(true);
    try {
      if (editingMessage) await api.patch(`/chamados/${selectedChamado?.id}/chat/${editingMessage.id}`, { mensagem: chatMessage.trim() });
      else await api.post(`/chamados/${selectedChamado?.id}/chat`, { mensagem: chatMessage.trim(), resposta_id: replyingTo?.id });
      setChatMessage(''); setReplyingTo(null); setEditingMessage(null);
    } catch (err) { alert('Erro ao enviar mensagem'); }
    finally { setChatLoading(false); }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm('Deseja excluir esta mensagem?')) return;
    try {
      await api.delete(`/chamados/${selectedChamado?.id}/chat/${msgId}`);
      // A atualização virá via Supabase Realtime se configurado, 
      // ou podemos filtrar localmente para feedback imediato.
      setChatMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) { alert('Erro ao excluir mensagem'); }
  };

  const handleDeleteChamado = async (id: number | string) => {
    if (!confirm('Tem certeza que deseja EXCLUIR este chamado permanentemente? Esta ação não pode ser desfeita.')) return;
    setActionLoading(true);
    try {
      await api.delete(`/chamados/${id}`);
      setSelectedChamado(null);
      fetchChamados();
    } catch (err) {
      alert('Erro ao excluir chamado.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div className={styles.tituloArea}>
          <div className={`${styles.icone} ${isProvas ? styles.iconeProvas : ''}`}>
            {isProvas ? <BookOpen color="#059669" size={20} /> : <Ticket color="var(--cor-primaria)" size={20} />}
          </div>
          <div>
            <h1 className={styles.titulo}>
              {isProvas ? 'Gestão de Provas / Chromebooks' : ((isAdmin || isTecnico) ? 'Painel de Chamados' : 'Meus Chamados')}
            </h1>
            <p className={styles.subtitulo}>
              {(isAdmin || isTecnico) ? 'Visualize e atenda as solicitações' : 'Histórico de chamados solicitados'}
            </p>
          </div>
        </div>
        <button onClick={() => { setShowNovoChamado(true); setNovoLocalSuporte(localStorage.getItem('lastLocal') || ''); }} className={`${styles.btnNovo} ${isProvas ? styles.btnNovoProvas : 'botao-primario'}`}>
          {isProvas ? <BookOpen size={18} /> : <Plus size={18} />}
          <span className={styles.btnNovoLabel}>{isProvas ? 'Nova Prova' : 'Novo Chamado'}</span>
          <span className={styles.btnNovoLabelMobile}>{isProvas ? 'Prova' : 'Novo'}</span>
        </button>
      </header>

      <div className="cartao">
        {loading ? (
          <div className={styles.carregando}>Carregando...</div>
        ) : chamados.length === 0 ? (
          <div className={styles.vazio}>
            <AlertCircle className={styles.vazioIcone} size={28} />
            <p>Nenhum chamado encontrado.</p>
          </div>
        ) : (
          <div className={styles.lista}>
            {chamados.map((chamado) => (
              <div key={chamado.id} className={styles.item} onClick={() => setSelectedChamado(chamado)}>
                <div className={styles.itemCabecalho}>
                  <div className={styles.itemEsquerda}>
                    <span className={`${styles.tipoTexto} ${getTipoTextColor(chamado.alerta || 'Suporte TI')}`}>
                      {getTipoLabel(chamado.mensagem)}
                    </span>
                    <div className={styles.itemBadges}>
                      <span className={styles.badgeCodigo}>#{chamado.codigo || chamado.id}</span>
                      <span className={`${styles.badgeStatus} ${getStatusColor(chamado.status || 'pendente')}`}>
                        {getStatusLabel(chamado.status || 'pendente')}
                      </span>
                    </div>
                  </div>
                  <span className={styles.dataTexto}><Clock size={12} /> {formatDate(chamado.timestamp)}</span>
                </div>
                <div className={styles.itemDetalhes}>
                  {(isAdmin || isTecnico) ? (
                    <>
                      <div className={styles.detalheItem}><User size={16} color="var(--cor-cinza-400)" /> <span>{chamado.nome_solicitante}</span></div>
                      <div className={styles.detalheItem}><Building size={16} color="var(--cor-cinza-400)" /> <span>{chamado.setor_solicitante || '-'}</span></div>
                      {chamado.tecnico_atendimento ? (
                        <div className={styles.detalheItemTecnico}>
                          <CheckCircle size={16} /> <span className={styles.tecnicoNomeTruncado}>{chamado.tecnico_nome || chamado.tecnico_atendimento}</span>
                        </div>
                      ) : <div className={styles.detalheItem}><MapPin size={16} color="var(--cor-cinza-400)" /> <span>{chamado.local_suporte}</span></div>}
                    </>
                  ) : (
                    <>
                      <div className={styles.detalheItem}><MapPin size={16} color="var(--cor-cinza-400)" /> <span>{chamado.local_suporte}</span></div>
                      {chamado.tecnico_atendimento && (
                        <div className={styles.detalheItemTecnicoSpan2}>
                          <CheckCircle size={16} /> <span>Técnico: {chamado.tecnico_nome || chamado.tecnico_atendimento}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {chamado.nota_validacao && (
                  <div className={styles.avaliacaoItem}>
                    {[1, 2, 3, 4, 5, 6].map((n) => <Star key={n} size={12} className={n <= chamado.nota_validacao! ? styles.estrelaAtiva : styles.estrelaVazia} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedChamado && (
        <div className={styles.modalOverlay} onClick={() => setSelectedChamado(null)}>
          <div className={`${styles.modal} cartao`} onClick={(e) => e.stopPropagation()} onPaste={handlePaste}>
            <div className={styles.modalConteudo}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderInfo}>
                  <div className={styles.modalBadges}>
                    <span className={styles.modalBadgeCodigo}>#{selectedChamado.codigo || selectedChamado.id}</span>
                    <span className={`${styles.modalBadgeStatus} ${getStatusColor(selectedChamado.status || 'pendente')}`}>
                      {getStatusLabel(selectedChamado.status || 'pendente')}
                    </span>
                  </div>
                  <h2 className={styles.modalTitulo}>{getTipoLabel(selectedChamado.mensagem)}</h2>
                </div>
                <button onClick={() => setSelectedChamado(null)} className={styles.btnFechar}><X size={20} /></button>
              </div>

              <div className={styles.modalBody}>
                <div>
                   <div className={styles.relatoHeader}>
                    <h4 className={styles.relatoTituloLabel}><FileText size={12} /> Relato</h4>
                    {(isAdmin || selectedChamado.nome_solicitante === currentUser) && selectedChamado.status !== 'fechado' && (
                       <button onClick={() => { if (!isEditingRelato) { if (selectedChamado.descricao?.startsWith('{"__isExcel":true')) { try { const data = JSON.parse(selectedChamado.descricao); setTempRelato(data.caption || ''); setTempExcelData({ ...data, caption: undefined }); } catch (e) { setTempRelato(selectedChamado.descricao); } } else { setTempRelato(selectedChamado.descricao || ''); } setTempTitulo(selectedChamado.mensagem || ''); } setIsEditingRelato(!isEditingRelato); }} className={`${styles.btnEditarRelato} ${isEditingRelato ? styles.btnEditarRelatoAtivo : ''}`}>
                         {isEditingRelato ? <X size={12} /> : <Edit3 size={12} />}
                       </button>
                    )}
                   </div>
                   {isEditingRelato ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                       <div className={styles.editandoGrupo}>
                         <label className={styles.editandoLabel}>Título</label>
                         <input type="text" value={tempTitulo} onChange={(e) => setTempTitulo(e.target.value)} className={styles.editandoInput} />
                       </div>
                       <div className={styles.editandoGrupo}>
                         <label className={styles.editandoLabel}>Descrição</label>
                         <textarea value={tempRelato} onChange={(e) => setTempRelato(e.target.value)} className={styles.editandoTextarea} />
                       </div>

                       {tempExcelData && (
                         <div className={styles.excelPreviewEditing}>
                           <div className={styles.excelPreviewEditingHeader}>
                             <span className={styles.excelPreviewEditingLabel}><Maximize2 size={12}/> Editar Planilha</span>
                             <button onClick={() => setTempExcelData(null)} className={styles.btnRemoverPlanilha}>Remover Planilha</button>
                           </div>
                           <div className={styles.excelPreviewWrapper}>
                             <ExcelTableRenderer 
                               data={tempExcelData} 
                               scale={0.9} 
                               hideControls 
                               editable
                               onCellChange={handleCellChange}
                             />
                           </div>
                         </div>
                       )}
                       <div className={styles.editandoAcoes}>
                         <button onClick={() => setIsEditingRelato(false)} className={styles.btnCancelarCampo}>Cancelar</button>
                         <button onClick={handleUpdateRelato} disabled={actionLoading} className="botao-primario">
                           {actionLoading ? <Loader2 size={14} className={styles.spin} /> : null}Salvar
                         </button>
                       </div>
                     </div>
                   ) : (
                     <div className={styles.relatoConteudo}>
                         {selectedChamado.descricao?.startsWith('{"__isExcel":true') ? (
                           (() => {
                             try {
                               const parsed = JSON.parse(selectedChamado.descricao);
                               const scale = isNaN(globalExcelScale) ? 1 : globalExcelScale;
                               return <ExcelTableRenderer data={parsed} scale={scale} onScaleChange={setGlobalExcelScale} />;
                             } catch (e) {
                               return <div className={styles.relatoPreWrap}>{selectedChamado.descricao}</div>;
                             }
                           })()
                         ) : (
                           <div className={styles.relatoPreWrap}>{selectedChamado.descricao}</div>
                         )}
                     </div>
                   )}
                </div>

                <div className={styles.gridTecnico}>
                  <div>
                    <div className={styles.secaoHeader}>
                      <span className={styles.secaoTituloAmbar}>Diagnóstico</span>
                    </div>
                    <div className={styles.campoBlocoAmbar}>
                      {selectedChamado.problema_encontrado || 'Aguardando diagnóstico...'}
                    </div>
                  </div>
                  <div>
                    <div className={styles.secaoHeader}>
                      <span className={styles.secaoTituloVerde}>Solução</span>
                    </div>
                    <div className={styles.campoBlocoVerde}>
                      {selectedChamado.solucao_aplicada || 'Aguardando encerramento...'}
                    </div>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <div className={styles.infoGrid}>
                    <div>
                      <p className={styles.dadoLabel}>Abertura</p>
                      <p className={styles.dadoValor}>{formatDate(selectedChamado.timestamp)}</p>
                    </div>
                    <div>
                      <p className={styles.dadoLabel}>Local</p>
                      <p className={styles.dadoValorTruncado}>{selectedChamado.local_suporte}</p>
                    </div>
                    <div>
                      <p className={styles.dadoLabel}>Solicitante</p>
                      <div className={styles.solicitanteInfo}>
                        <div className={styles.solicitanteAvatar}>
                          {selectedChamado.nome_solicitante?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={styles.solicitanteNome}>{selectedChamado.nome_solicitante}</p>
                          {selectedChamado.setor_solicitante && (
                            <p className={styles.solicitanteSetor}>{selectedChamado.setor_solicitante}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedChamado.tecnico_atendimento && (
                    <div className={styles.equipeContainer}>
                      <p className={styles.equipeLabel}>Equipe técnica</p>
                      <div className={styles.equipeGrupo}>
                        <span className={styles.equipeTecnicoResponsavel}>
                          {selectedChamado.tecnico_nome || selectedChamado.tecnico_atendimento}
                        </span>
                        {selectedChamado.tecnicos_adicionais_nomes?.map((nome, i) => (
                          <span key={i} className={styles.equipeApoio}>
                            <span className={styles.equipeApoioLabel}>+</span> {nome}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.acoesChamado}>
                   {(isTecnico || isAdmin) && selectedChamado.status === 'pendente' && <button onClick={() => handleAtender(selectedChamado)} className={`${styles.btnAcaoBase} ${styles.btnAtender}`}>Atender</button>}
                   {(isAdmin || (isTecnico && podeEditarChamado(selectedChamado))) && (selectedChamado.status === 'em_atendimento' || selectedChamado.status === 'solucao_negada') && <button onClick={() => { setShowConcluirModal(true); setProblema(selectedChamado.problema_encontrado || ''); setSolucao(''); }} className={`${styles.btnAcaoBase} ${styles.btnLancarSolucao}`}>Solução</button>}
                   <button onClick={openChat} className={`${styles.btnAcaoBase} ${styles.btnChat}`}><MessageCircle size={14} /> Chat</button>
                   {isAdmin && (
                     <button 
                       onClick={() => handleDeleteChamado(selectedChamado.id)} 
                       className={`${styles.btnAcaoBase} ${styles.btnExcluir}`}
                       disabled={actionLoading}
                     >
                       <Trash2 size={14} /> Excluir
                     </button>
                   )}
                   {(isAdmin || selectedChamado.nome_solicitante === currentUser) && selectedChamado.status === 'solucionado' && (
                     <button onClick={() => setShowValidarModal(true)} className={`${styles.btnAcaoBase} ${styles.btnAvaliar}`}>
                       <Star size={14} /> Avaliar Atendimento
                     </button>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConcluirModal && selectedChamado && (
        <div className={styles.modal2Overlay} onClick={() => setShowConcluirModal(false)}>
          <div className={`${styles.modal2} cartao`} onClick={(e) => e.stopPropagation()}>

            <div className={styles.concluirHeader}>
              <span className={`${styles.concluirIcone} ${styles.concluirIconeVerde}`}>
                <CheckCircle size={22} color="#059669" />
              </span>
              <div>
                <p className={styles.concluirSubtitulo}>#{selectedChamado.codigo || selectedChamado.id}</p>
                <h2 className={styles.concluirTitulo}>Lançar Solução</h2>
              </div>
              <button onClick={() => setShowConcluirModal(false)} className={styles.btnFechar} style={{ marginLeft: 'auto' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={styles.concluirLabel}>Problema encontrado</label>
                <textarea
                  value={problema}
                  onChange={(e) => setProblema(e.target.value)}
                  placeholder="Descreva o problema identificado..."
                  className={styles.campoEditarAmbar}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: '1.6' }}
                />
              </div>

              <div>
                <label className={styles.concluirLabel}>Solução aplicada</label>
                <textarea
                  value={solucao}
                  onChange={(e) => setSolucao(e.target.value)}
                  placeholder="Descreva como o problema foi resolvido..."
                  className={styles.campoEditarVerde}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: '1.6' }}
                />
              </div>

              {selectedChamado.status === 'solucao_negada' && (
                <div className={styles.avisoInfo}>
                  <AlertCircle size={14} />
                  <p className={styles.avisoInfoTexto}>
                    A solução anterior foi negada pelo solicitante. Revise e submeta novamente.
                  </p>
                </div>
              )}
            </div>

            <div className={styles.concluirAcoes}>
              <button onClick={() => setShowConcluirModal(false)} className={styles.btnCancelarConcluir}>
                Cancelar
              </button>
              {!selectedChamado.problema_encontrado && (
                <button
                  onClick={handleDiagnostico}
                  disabled={!problema.trim() || actionLoading}
                  className={styles.btnLancarDiagnostico}
                >
                  {actionLoading ? <Loader2 size={14} className={styles.spin} /> : null}
                  Salvar Diagnóstico
                </button>
              )}
              <button
                onClick={handleConcluir}
                disabled={!solucao.trim() || actionLoading}
                className={styles.btnConcluirChamado}
              >
                {actionLoading ? <Loader2 size={14} className={styles.spin} /> : null}
                Concluir Chamado
              </button>
            </div>

          </div>
        </div>
      )}

      {showValidarModal && selectedChamado && (
        <div className={styles.modal2Overlay} onClick={() => setShowValidarModal(false)}>
          <div className={`${styles.modal2} cartao`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.validarHeader}>
              <div className={styles.validarIcone}>
                <Star size={24} />
              </div>
              <div>
                <p className={styles.validarSubtitulo}>#{selectedChamado.codigo || selectedChamado.id}</p>
                <h2 className={styles.validarTitulo}>Avaliar Atendimento</h2>
              </div>
              <button onClick={() => setShowValidarModal(false)} className={styles.btnFechar} style={{ marginLeft: 'auto' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className={styles.observacaoLabel}>Sua nota para este atendimento</label>
                <div className={styles.notaGrid}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div 
                      key={n} 
                      className={`${styles.notaItem} ${nota === n ? styles.notaItemAtiva : ''}`}
                      onClick={() => setNota(n)}
                    >
                      <Star size={20} className={styles.notaEstrela} />
                      <span className={styles.notaValor}>{n}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={styles.observacaoLabel}>Observações (Opcional)</label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Conte-nos o que achou da solução..."
                  className={styles.observacaoTextarea}
                />
              </div>

              {selectedChamado.status === 'solucionado' && (
                <div className={styles.avisoInfo}>
                  <Info size={14} />
                  <p className={styles.avisoInfoTexto}>
                    Sua avaliação é importante para melhorarmos nosso suporte.
                  </p>
                </div>
              )}
            </div>

            <div className={styles.validarAcoes}>
              <button 
                onClick={() => handleValidar(false)} 
                disabled={actionLoading}
                className={styles.btnReprovar}
              >
                {actionLoading ? <Loader2 size={16} className={styles.spin} /> : <X size={16} />}
                Reprovar
              </button>
              <button 
                onClick={() => handleValidar(true)} 
                disabled={!nota || actionLoading}
                className={styles.btnAprovar}
              >
                {actionLoading ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />}
                Aprovar Solução
              </button>
            </div>
          </div>
        </div>
      )}

      {showNovoChamado && (
        <div className={styles.modalOverlay} onClick={() => setShowNovoChamado(false)}>
          <div className={`${styles.novoChamadoModal} cartao`} onClick={(e) => e.stopPropagation()} onPaste={handlePaste}>

            <div className={styles.novoChamadoHeader}>
              <div className={styles.novoChamadoHeaderEsquerda}>
                <span className={`${styles.novoChamadoIcone} ${isProvas ? styles.novoChamadoIconeProvas : styles.novoChamadoIconeSuporte}`}>
                  {isProvas ? <BookOpen size={18} color="#059669" /> : <Ticket size={18} color="#4f46e5" />}
                </span>
                <div>
                  <p className={styles.novoChamadoSubtitulo}>{isProvas ? 'Prova' : 'Suporte TI'}</p>
                  <h2 className={styles.novoChamadoTitulo}>{isProvas ? 'Nova Prova' : 'Novo Chamado'}</h2>
                </div>
              </div>
              <button onClick={() => setShowNovoChamado(false)} className={styles.btnFechar}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.novoForm}>
              <div className={styles.novoCampo}>
                <label className={styles.novoLabel}>Título <span className={styles.novoObrigatorio}>*</span></label>
                <div className={styles.novoInputWrapper}>
                  <FileText size={15} className={styles.novoInputIcone} />
                  <input
                    type="text"
                    value={novoTitulo}
                    onChange={(e) => { setNovoTitulo(e.target.value); setNovoErro(''); }}
                    placeholder={isProvas ? 'Ex: Prova de Matemática – 3º Ano' : 'Ex: Computador não liga na sala 3'}
                    className={`${styles.novoInput} ${styles.novoInputComIcone}`}
                  />
                </div>
              </div>

              <div className={styles.novoCampo}>
                <label className={styles.novoLabel}>Local de suporte <span className={styles.novoObrigatorio}>*</span></label>
                <div className={styles.novoInputWrapper}>
                  <MapPin size={15} className={styles.novoInputIcone} />
                  <input
                    type="text"
                    value={novoLocalSuporte}
                    onChange={(e) => { setNovoLocalSuporte(e.target.value); setNovoErro(''); }}
                    placeholder="Ex: Sala 3, Bloco B"
                    className={`${styles.novoInput} ${styles.novoInputComIcone}`}
                  />
                </div>
              </div>

              <div className={styles.novoCampo}>
                <label className={styles.novoLabel}>Descrição</label>
                <textarea
                  value={novoMensagem}
                  onChange={(e) => setNovoMensagem(e.target.value)}
                  placeholder="Descreva o problema com mais detalhes..."
                  className={styles.novoTextarea}
                />
              </div>

              {isProvas && (
                <div className={styles.planilhaContainer}>
                  <div className={styles.planilhaHeader}>
                    <span className={styles.planilhaHeaderIcone}>
                      <Upload size={16} color="#059669" />
                    </span>
                    <div>
                      <p className={styles.planilhaHeaderLabel}>Planilha Excel</p>
                      <p className={styles.planilhaHeaderSub}>Arquivo .xlsx da prova</p>
                    </div>
                  </div>
                  {excelData ? (
                    <>
                      <div className={styles.planilhaPreview}>
                        <ExcelTableRenderer 
                           data={excelData} 
                           scale={1} 
                           editable 
                           onCellChange={handleCellChange}
                        />
                      </div>
                      <button onClick={() => setExcelData(null)} className={styles.btnRemoverPlanilha2}>
                        Remover planilha
                      </button>
                    </>
                  ) : (
                    <label className={styles.uploadArea}>
                      <Upload size={20} color="#059669" />
                      <p className={styles.uploadLabel}>Clique para anexar</p>
                      <p className={styles.uploadDica}>Somente arquivos .xlsx</p>
                      <input type="file" accept=".xlsx" onChange={handleExcelUpload} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              )}

              {novoErro && (
                <div className={styles.novoErroContainer}>
                  <AlertCircle size={14} />
                  <span className={styles.novoErroTexto}>{novoErro}</span>
                </div>
              )}

              <div className={styles.novoChamadoFooter}>
                <button
                  onClick={handleEnviarNovoChamado}
                  className={`${styles.btnSubmitNovo} ${isProvas ? styles.btnSubmitProvas : styles.btnSubmitSuporte}`}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <Loader2 size={20} className={styles.spin} />
                    : (isProvas ? <BookOpen size={20} /> : <Ticket size={20} />)
                  }
                  <span className={styles.btnSubmitNovoLabel}>
                    {actionLoading ? 'Enviando...' : isProvas ? 'Enviar Prova' : 'Abrir Chamado'}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {showChat && (
        <div className={styles.chatOverlay} onClick={() => setShowChat(false)}>
          <div className={`${styles.modal} ${styles.chatModal}`} onClick={(e) => e.stopPropagation()}>

            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderEsquerda}>
                <div className={styles.chatAvatar}>
                  <MessageCircle size={16} />
                </div>
                <div>
                  <p className={styles.chatSubtitulo}>Chamado #{selectedChamado?.codigo || selectedChamado?.id}</p>
                  <h3 className={styles.chatTitulo}>{getTipoLabel(selectedChamado?.mensagem || "")}</h3>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className={styles.btnFecharDesktop}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.chatConteiner} id="chat-container">
              {chatLoading ? (
                <div className={styles.chatLoading}>
                  <div className={styles.chatLoadingBubble}>Carregando mensagens...</div>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className={styles.chatVazio}>
                  <div className={styles.chatVazioIcone}><MessageCircle size={32} /></div>
                  <p className={styles.chatVazioTexto}>Nenhuma mensagem ainda</p>
                </div>
              ) : (
                chatMessages.map((m) => {
                  const isMe = m.usuario === username;
                  const repliedMsg = m.resposta_id ? chatMessages.find(msg => msg.id === m.resposta_id) : null;
                  const roleBadgeClass = m.role === 'admin' ? styles.roleBadgeAdmin : m.role === 'tecnico' ? styles.roleBadgeTecnico : styles.roleBadgeSolicitante;
                  
                  const renderMessageContent = (text: string) => {
                    // Caso 1: JSON do Excel incorporado no relato inicial (sistema)
                    if (text.includes('*Descrição:* {"__isExcel":true')) {
                      const parts = text.split('*Descrição:* ');
                      const header = parts[0];
                      try {
                        const excelData = JSON.parse(parts[1]);
                        return (
                          <>
                            <div className={styles.relatoPreWrap}>{header}</div>
                            <div className={styles.chatExcelWrapper}>
                              <ExcelTableRenderer data={excelData} scale={0.7} />
                            </div>
                          </>
                        );
                      } catch (e) {
                        return <div className={styles.relatoPreWrap}>{text}</div>;
                      }
                    }
                    
                    // Caso 2: Mensagem que é puramente o JSON do Excel
                    if (text.startsWith('{"__isExcel":true')) {
                      try {
                        const data = JSON.parse(text);
                        return (
                          <div className={styles.chatExcelWrapper}>
                            <ExcelTableRenderer data={data} scale={0.7} />
                          </div>
                        );
                      } catch (e) {
                        return <div className={styles.relatoPreWrap}>{text}</div>;
                      }
                    }

                    // Caso padrão: Texto puro
                    return <div className={styles.relatoPreWrap}>{text}</div>;
                  };

                  return (
                    <div key={m.id} className={styles.mensagemWrapper}>
                      <div className={`${styles.mensagemFlex} ${isMe ? styles.mensagemFlexMinha : styles.mensagemFlexOutro}`}>
                        <div className={`${styles.mensagemBalaoWrapper} ${isMe ? styles.mensagemBalaoWrapperMinha : styles.mensagemBalaoWrapperOutro} ${m.mensagem.includes('__isExcel') ? styles.mensagemBalaoWrapperExcel : ''}`}>
                          {!isMe && (
                            <div className={styles.mensagemNomeHeader}>
                              <span className={styles.mensagemNome}>{m.nome_usuario || m.usuario}</span>
                              <span className={`${styles.roleBadge} ${roleBadgeClass}`}>{m.role}</span>
                            </div>
                          )}
                          
                          <div className={`${styles.mensagemBalao} ${isMe ? styles.mensagemBalaoMinha : styles.mensagemBalaoOutro}`}>
                            {repliedMsg && (
                              <div className={styles.replyNoBalao} onClick={() => {
                                const el = document.getElementById(`msg-${repliedMsg.id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}>
                                <span className={styles.replyNoBalaoNome}>{repliedMsg.nome_usuario || repliedMsg.usuario}</span>
                                <span className={styles.replyNoBalaoTexto}>{repliedMsg.mensagem}</span>
                              </div>
                            )}
                            
                            <div className={styles.mensagemTexto} id={`msg-${m.id}`}>
                              {renderMessageContent(m.mensagem)}
                            </div>
                            
                            <div className={styles.mensagemMeta}>
                              <span className={styles.mensagemTempo}>
                                {m.editada && '(editada) '}
                                {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <div className={`${styles.mensagemAcoes} ${isMe ? styles.mensagemAcoesMinha : styles.mensagemAcoesOutro}`}>
                            <button onClick={() => setReplyingTo(m)} className={styles.btnAcaoMsg} title="Responder">
                              <CornerUpLeft size={14} />
                            </button>
                            {isMe && (
                              <button onClick={() => startEditing(m)} className={styles.btnAcaoMsg} title="Editar">
                                <Edit3 size={14} />
                              </button>
                            )}
                            {(isMe || isAdmin) && (
                              <button onClick={() => handleDeleteMessage(m.id)} className={`${styles.btnAcaoMsg} ${styles.btnAcaoMsgExcluir}`} title="Excluir">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.chatInputArea}>
              <div className={styles.chatInputInner}>
                {(replyingTo || editingMessage) && (
                  <div className={`${styles.chatPreviewHeader} ${editingMessage ? styles.chatPreviewHeaderEditing : ''}`}>
                    <div className={styles.chatPreviewIcon}>
                      {editingMessage ? <Edit3 size={16} className={styles.chatPreviewIconEditing} /> : <Reply size={16} />}
                    </div>
                    <div className={styles.chatPreviewContent}>
                      <span className={`${styles.chatPreviewLabel} ${editingMessage ? styles.chatPreviewLabelEditing : ''}`}>
                        {editingMessage ? 'Editando mensagem' : `Respondendo a ${replyingTo?.nome_usuario || replyingTo?.usuario}`}
                      </span>
                      <span className={styles.chatPreviewText}>
                        {editingMessage ? editingMessage.mensagem : replyingTo?.mensagem}
                      </span>
                    </div>
                    <button className={styles.btnCancelPreview} onClick={() => { setReplyingTo(null); setEditingMessage(null); setChatMessage(''); }}>
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div className={styles.chatInputWrapper}>
                  <textarea
                    className={styles.chatInput}
                    placeholder="Escreva uma mensagem..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                    }}
                  />
                  <button 
                    className={`${styles.btnEnviar} ${editingMessage ? styles.btnEnviarEditing : ''}`} 
                    onClick={sendChatMessage} 
                    disabled={!chatMessage.trim() || chatLoading}
                  >
                    {chatLoading ? <Loader2 size={20} className={styles.spin} /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
