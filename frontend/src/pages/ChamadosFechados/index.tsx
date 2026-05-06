import { useState, useEffect } from 'react';
import {
  Clock, MapPin, User, Building, AlertCircle, X, Archive,
  CheckCircle, Star, RotateCcw, Trash2, FileText, Trophy
} from 'lucide-react';
import api from '../../api';
import type { Chamado } from '../../types';
import { formatDate, getTipoLabel, getTipoTextColor } from '../../utils/formatters';
import ExcelTableRenderer from '../../components/ExcelTableRenderer';
import styles from './styles.module.css';

if (typeof (window as any).global === 'undefined') (window as any).global = window;
if (typeof (window as any).Buffer === 'undefined') (window as any).Buffer = { isBuffer: () => false };
if (typeof (window as any).process === 'undefined') (window as any).process = { env: {} };

interface ChamadosFechadosProps {
  tipo?: 'suporte' | 'provas';
}

export default function ChamadosFechados({ tipo }: ChamadosFechadosProps) {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const isAdmin = localStorage.getItem('userRole') === 'admin';
  const isProvas = tipo === 'provas';

  const fetchChamados = () => {
    const alertaFiltro = isProvas ? 'Provas' : 'Suporte TI';
    api.get(`/chamados-fechados?alerta=${alertaFiltro}`)
      .then((res) => setChamados(res.data || []))
      .catch(() => setChamados([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchChamados(); }, [tipo]);

  const handleReabrir = async (chamado: Chamado) => {
    if (!confirm('Deseja realmente reabrir este chamado?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/chamados/${chamado.id}/reabrir`);
      fetchChamados();
      setSelectedChamado(null);
    } catch (err) {
      console.error('Erro ao reabrir:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExcluir = async (chamado: Chamado) => {
    if (!confirm('Tem certeza que deseja EXCLUIR este chamado permanentemente? Esta ação não pode ser desfeita.')) return;
    setActionLoading(true);
    try {
      await api.delete(`/chamados/${chamado.id}`);
      fetchChamados();
      setSelectedChamado(null);
    } catch (err) {
      console.error('Erro ao excluir:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const renderStars = (nota: number, size = 12) => (
    <div className={styles.estrelas}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Star key={n} size={size} className={n <= nota ? styles.estrelaAtiva : styles.estrelaVazia} />
      ))}
    </div>
  );

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div className={`${styles.icone} ${isProvas ? styles.iconeProvas : styles.iconeSuporte}`}>
          {isProvas
            ? <CheckCircle color="var(--cor-sucesso)" size={20} />
            : <Archive color="var(--cor-verde)" size={20} />
          }
        </div>
        <div>
          <h1 className={styles.titulo}>
            {isProvas ? 'Histórico de Provas' : 'Histórico de Suporte'}
          </h1>
          <p className={styles.subtitulo}>
            {isProvas
              ? 'Encontre aqui os registros de Chromebooks concluídos'
              : 'Histórico de chamados de TI concluídos e validados'}
          </p>
        </div>
      </header>

      <div className="cartao">
        {loading ? (
          <div className={styles.carregando}>Carregando...</div>
        ) : chamados.length === 0 ? (
          <div className={styles.vazio}>
            <AlertCircle className={styles.vazioIcone} size={28} />
            <p>Nenhum chamado fechado encontrado.</p>
          </div>
        ) : (
          <div className={styles.lista}>
            {chamados.map((chamado) => (
              <div
                key={chamado.id}
                className={styles.item}
                onClick={() => setSelectedChamado(chamado)}
              >
                <div className={styles.itemCabecalho}>
                  <div className={styles.itemEsquerda}>
                    <span className={`${styles.tipoTexto} ${getTipoTextColor(chamado.alerta || 'Suporte TI')}`}>
                      {getTipoLabel(chamado.mensagem)}
                    </span>
                    <div className={styles.itemBadges}>
                      <span className={styles.badgeCodigo}>#{chamado.codigo || chamado.id}</span>
                      <span className={styles.badgeFechado}>Fechado</span>
                    </div>
                  </div>
                  <span className={styles.dataTexto}>
                    <Clock size={12} />
                    {formatDate(chamado.timestamp)}
                  </span>
                </div>

                <div className={styles.itemDetalhes}>
                  <div className={styles.detalheItem}>
                    <User size={16} color="var(--cor-cinza-400)" />
                    <span>{chamado.nome_solicitante}</span>
                  </div>
                  <div className={styles.detalheItem}>
                    <Building size={16} color="var(--cor-cinza-400)" />
                    <span>{chamado.setor_solicitante || '-'}</span>
                  </div>
                  {chamado.tecnico_atendimento ? (
                    <div className={styles.detalheItemTecnico}>
                      <CheckCircle size={16} color="var(--cor-sucesso-fundo)" />
                      <span>
                        {chamado.tecnico_nome || chamado.tecnico_atendimento}
                        {chamado.tecnicos_adicionais_nomes && chamado.tecnicos_adicionais_nomes.length > 0 && (
                          <span className={styles.tecnicoAdicional}>
                            + {chamado.tecnicos_adicionais_nomes.length}
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className={styles.detalheItem}>
                      <MapPin size={16} color="var(--cor-cinza-400)" />
                      <span>{chamado.local_suporte}</span>
                    </div>
                  )}
                </div>

                {chamado.nota_validacao && (
                  <div className={styles.avaliacaoItem}>
                    <span className={styles.avaliacaoLabel}>Avaliação do Atendimento:</span>
                    {renderStars(chamado.nota_validacao)}
                  </div>
                )}

                {chamado.descricao && (
                  <div className={styles.descricaoTruncada}>{chamado.descricao}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedChamado && (
        <div className={styles.modalOverlay} onClick={() => setSelectedChamado(null)}>
          <div className={`cartao ${styles.modal} animate-in fade-in zoom-in`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalGrid}>

              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderInfo}>
                  <div className={styles.modalBadges}>
                    <span className={styles.modalBadgeCodigo}>
                      #{selectedChamado.codigo || selectedChamado.id}
                    </span>
                    <span className={styles.modalBadgeFechado}>Fechado</span>
                  </div>
                  <h2 className={styles.modalTitulo}>
                    {getTipoLabel(selectedChamado.mensagem)}
                  </h2>
                </div>
                <button onClick={() => setSelectedChamado(null)} className={styles.btnFechar}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.colConteudo}>
                <div>
                  <h4 className={`${styles.secaoTitulo} ${styles.secaoTituloNeutro}`}>
                    <FileText size={12} color="var(--cor-primaria)" /> Relato do Problema
                  </h4>
                  <div className={`${styles.secaoConteudo} ${styles.secaoConteudoNeutro}`}>
                    {(() => {
                      if (selectedChamado.descricao?.startsWith('{"__isExcel":true')) {
                        try {
                          return <ExcelTableRenderer data={JSON.parse(selectedChamado.descricao)} />;
                        } catch (e) {
                          console.error('Erro ao parsear Excel JSON Fechado:', e);
                          return selectedChamado.descricao;
                        }
                      }
                      return selectedChamado.descricao || 'Nenhuma descrição fornecida.';
                    })()}
                  </div>
                </div>

                {selectedChamado.problema_encontrado && (
                  <div>
                    <h4 className={`${styles.secaoTitulo} ${styles.secaoTituloDiagnostico}`}>
                      Diagnóstico Técnico
                    </h4>
                    <div className={`${styles.secaoConteudo} ${styles.secaoConteudoDiagnostico}`}>
                      {selectedChamado.problema_encontrado}
                    </div>
                  </div>
                )}

                {selectedChamado.solucao_aplicada && (
                  <div>
                    <h4 className={`${styles.secaoTitulo} ${styles.secaoTituloSolucao}`}>
                      Solução Aplicada
                    </h4>
                    <div className={`${styles.secaoConteudo} ${styles.secaoConteudoSolucao}`}>
                      {selectedChamado.solucao_aplicada}
                    </div>
                  </div>
                )}

                {selectedChamado.nota_validacao && (
                  <div className={styles.avaliacaoModal}>
                    <div className={styles.avaliacaoModalEsquerda}>
                      <Trophy size={16} color="var(--cor-primaria)" />
                      <span className={styles.avaliacaoModalLabel}>Avaliação:</span>
                    </div>
                    <div className={styles.estrelas}>
                      {renderStars(selectedChamado.nota_validacao, 14)}
                      <span className={styles.avaliacaoModalNota}>{selectedChamado.nota_validacao}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.colDados}>
                <div className={styles.dadosCard}>
                  <div className={styles.dadosGrid}>
                    <div className={styles.dadoItem}>
                      <p className={styles.dadoLabel}>Abertura</p>
                      <p className={styles.dadoValor}>{formatDate(selectedChamado.timestamp)}</p>
                    </div>
                    <div className={styles.dadoItem}>
                      <p className={styles.dadoLabel}>Local</p>
                      <p className={styles.dadoValorTruncado} title={selectedChamado.local_suporte}>
                        {selectedChamado.local_suporte}
                      </p>
                    </div>

                    <div className={styles.dadoItemFull}>
                      <p className={styles.dadoLabel}>Solicitante</p>
                      <div className={styles.solicitanteInfo}>
                        <div className={styles.solicitanteAvatar}>
                          {selectedChamado.nome_solicitante?.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className={styles.solicitanteNome}>{selectedChamado.nome_solicitante}</p>
                          <p className={styles.solicitanteSetor}>
                            {selectedChamado.setor_solicitante || 'Setor não informado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedChamado.tecnico_atendimento && (
                      <div className={styles.dadoItemFull}>
                        <p className={styles.dadoLabel}>Equipe de Suporte</p>
                        <p className={styles.equipeTecnico}>
                          {selectedChamado.tecnico_nome || selectedChamado.tecnico_atendimento} (Responsável)
                        </p>
                        {selectedChamado.tecnicos_adicionais_nomes && selectedChamado.tecnicos_adicionais_nomes.length > 0 && (
                          <p className={styles.equipeApoio}>
                            <span className={styles.equipeApoioLabel}>Apoio:</span>{' '}
                            {selectedChamado.tecnicos_adicionais_nomes.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.acoesModal}>
                  <button
                    onClick={() => handleReabrir(selectedChamado)}
                    disabled={actionLoading}
                    className={`botao-secundario ${styles.btnReabrir}`}
                  >
                    <RotateCcw size={16} /> Reabrir este Chamado
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleExcluir(selectedChamado)}
                      disabled={actionLoading}
                      className={`botao-secundario ${styles.btnExcluir}`}
                    >
                      <Trash2 size={16} /> Excluir Registro
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
