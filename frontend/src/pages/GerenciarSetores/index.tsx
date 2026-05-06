import { useState, useEffect } from 'react';
import { Building, Trash2, Plus, AlertCircle, X, Edit2 } from 'lucide-react';
import api from '../../api';
import styles from './styles.module.css';

import { SetorLocal, StatusNotificacao } from './types';

export default function GerenciarSetores() {
  const [setores, setSetores] = useState<SetorLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSetor, setEditingSetor] = useState<SetorLocal | null>(null);
  const [newNome, setNewNome] = useState('');
  const [editNome, setEditNome] = useState('');
  const [status, setStatus] = useState<StatusNotificacao>({ type: '', message: '' });

  useEffect(() => { fetchSetores(); }, []);

  const fetchSetores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/locais');
      setSetores(response.data || []);
    } catch (err) { console.error('Erro ao buscar setores:', err); }
    finally { setLoading(false); }
  };

  const gerarSlug = (nome: string) =>
    nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o setor "${nome}"?`)) return;
    try { await api.delete(`/locais/${id}`); fetchSetores(); }
    catch (err) { alert('Erro ao excluir setor.'); console.error(err); }
  };

  const handleEdit = (setor: SetorLocal) => {
    setEditingSetor(setor);
    setEditNome(setor.nome);
    setStatus({ type: '', message: '' });
    setShowEditModal(true);
  };

  const handleUpdateSetor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetor) return;
    if (!editNome.trim()) { setStatus({ type: 'error', message: 'O nome do setor é obrigatório.' }); return; }
    try {
      await api.put(`/locais/${editingSetor.id}`, { nome: editNome, slug: gerarSlug(editNome) });
      setStatus({ type: 'success', message: 'Setor atualizado com sucesso!' });
      fetchSetores();
      setTimeout(() => { setShowEditModal(false); setEditingSetor(null); setStatus({ type: '', message: '' }); }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar setor.';
      setStatus({ type: 'error', message });
    }
  };

  const handleCreateSetor = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    if (!newNome.trim()) { setStatus({ type: 'error', message: 'O nome do setor é obrigatório.' }); return; }
    try {
      await api.post('/locais', { nome: newNome, slug: gerarSlug(newNome) });
      setStatus({ type: 'success', message: `Setor "${newNome}" criado com sucesso!` });
      setNewNome('');
      fetchSetores();
      setTimeout(() => { setShowModal(false); setStatus({ type: '', message: '' }); }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar setor.';
      setStatus({ type: 'error', message });
    }
  };

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <div className={styles.cabecalhoInner}>
          <div className={styles.tituloCabecalho}>
            <div className={styles.icone}><Building color="var(--cor-primaria)" size={20} /></div>
            <div>
              <h1 className={styles.titulo}>Gerenciar Setores</h1>
              <p className={styles.subtitulo}>Visualize e gerencie os setores do sistema</p>
            </div>
          </div>
          <button
            onClick={() => { setShowModal(true); setStatus({ type: '', message: '' }); setNewNome(''); }}
            className={`botao-primario ${styles.btnNovo}`}
          >
            <Plus size={16} />
            <span className={styles.btnNovoLabel}>Novo Setor</span>
          </button>
        </div>
      </div>

      <div className={`cartao ${styles.tabelaWrapper}`}>
        {loading ? (
          <div className={styles.carregando}>Carregando...</div>
        ) : setores.length === 0 ? (
          <div className={styles.vazio}>Nenhum setor encontrado.</div>
        ) : (
          <div>
            <table className={`${styles.tabela} ${styles.cardsDesktop}`}>
              <thead>
                <tr>
                  <th className={styles.tabelaTh}>Setor</th>
                  <th className={styles.tabelaTh}>Criado em</th>
                  <th className={`${styles.tabelaTh} ${styles.colAcoes}`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {setores.map((setor) => (
                  <tr key={setor.id} className={styles.tabelaTr}>
                    <td className={styles.tabelaTd}>
                      <div className={styles.setorInfo}>
                        <div className={styles.setorIcone}><Building size={20} color="var(--cor-primaria)" /></div>
                        <span className={styles.setorNome}>{setor.nome}</span>
                      </div>
                    </td>
                    <td className={`${styles.tabelaTd} ${styles.dataTexto}`}>{new Date(setor.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className={`${styles.tabelaTd} ${styles.acoesTd}`}>
                      <button onClick={() => handleEdit(setor)} className={`${styles.btnAcao} ${styles.btnEditar}`} title="Editar"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(setor.id, setor.nome)} className={`${styles.btnAcao} ${styles.btnExcluir}`} title="Excluir"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.cardsMobile}>
              {setores.map((setor) => (
                <div key={setor.id} className={styles.cardMobile}>
                  <div className={styles.cardMobileTopo}>
                    <div className={styles.cardMobileInfo}>
                      <div className={styles.setorIcone}><Building size={20} color="var(--cor-primaria)" /></div>
                      <span className={styles.cardMobileNome}>{setor.nome}</span>
                    </div>
                  </div>
                  <div className={styles.cardMobileMeta}>
                    <span>Criado em: {new Date(setor.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className={styles.cardMobileAcoes}>
                    <button onClick={() => handleEdit(setor)} className={`${styles.btnAcao} ${styles.btnEditar}`}><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(setor.id, setor.nome)} className={`${styles.btnAcao} ${styles.btnExcluir}`}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`cartao ${styles.modal}`}>
            <div className={styles.modalCabecalho}>
              <div className={styles.modalCabecalhoTitulo}>
                <div className={styles.modalIcone}><Plus color="var(--cor-primaria)" size={24} /></div>
                <h3 className={styles.modalTituloTexto}>Novo Setor</h3>
              </div>
              <button onClick={() => setShowModal(false)} className={styles.btnFechar}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSetor} className={styles.form}>
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Nome do Setor</label>
                <input type="text" className="campo" placeholder="Ex: Sala de Aula 101" value={newNome} onChange={(e) => setNewNome(e.target.value)} required />
              </div>
              {status.message && (
                <div className={`${styles.alertaForm} ${status.type === 'success' ? styles.alertaSucesso : styles.alertaErro}`}>
                  {status.type === 'success' ? <Building size={18} /> : <AlertCircle size={18} />}
                  {status.message}
                </div>
              )}
              <div className={styles.botoesDuplos}>
                <button type="button" onClick={() => setShowModal(false)} className={`botao-secundario ${styles.btnModal}`}>Cancelar</button>
                <button type="submit" className={`botao-primario ${styles.btnModal}`}>Criar Setor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && editingSetor && (
        <div className={styles.modalOverlay}>
          <div className={`cartao ${styles.modal}`}>
            <div className={styles.modalCabecalho}>
              <div className={styles.modalCabecalhoTitulo}>
                <div className={styles.modalIcone}><Edit2 color="var(--cor-primaria)" size={24} /></div>
                <h3 className={styles.modalTituloTexto}>Editar Setor</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className={styles.btnFechar}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateSetor} className={styles.form}>
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Nome do Setor</label>
                <input type="text" className="campo" placeholder="Ex: Sala de Aula 101" value={editNome} onChange={(e) => setEditNome(e.target.value)} required />
              </div>
              {status.message && (
                <div className={`${styles.alertaForm} ${status.type === 'success' ? styles.alertaSucesso : styles.alertaErro}`}>
                  {status.type === 'success' ? <Building size={18} /> : <AlertCircle size={18} />}
                  {status.message}
                </div>
              )}
              <div className={styles.botoesDuplos}>
                <button type="button" onClick={() => setShowEditModal(false)} className={`botao-secundario ${styles.btnModal}`}>Cancelar</button>
                <button type="submit" className={`botao-primario ${styles.btnModal}`}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
