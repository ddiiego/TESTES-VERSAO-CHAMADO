import { useState, useEffect } from 'react';
import { Users, Trash2, Shield, UserCheck, Wrench, Plus, AlertCircle, X, Edit2, Building } from 'lucide-react';
import api from '../../api';
import { getRoleLabel, getRoleBadgeColor } from '../../utils/formatters';
import styles from './styles.module.css';

import { UsuarioLocal, SetorLocal, StatusNotificacao, UsuarioFormPayload } from './types';

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioLocal[]>([]);
  const [setores, setSetores] = useState<SetorLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioLocal | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editNomeCompleto, setEditNomeCompleto] = useState('');
  const [editSetorId, setEditSetorId] = useState('');
  const [editRole, setEditRole] = useState('solicitante');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newNomeCompleto, setNewNomeCompleto] = useState('');
  const [newSetorId, setNewSetorId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('solicitante');
  const [status, setStatus] = useState<StatusNotificacao>({ type: '', message: '' });

  useEffect(() => { fetchUsuarios(); fetchSetores(); }, []);

  const fetchSetores = async () => {
    try {
      const response = await api.get('/locais');
      setSetores(response.data || []);
    } catch (err) { console.error('Erro ao buscar setores:', err); }
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/usuarios');
      setUsuarios(response.data || []);
    } catch (err) { console.error('Erro ao buscar usuários:', err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) return;
    try { await api.delete(`/usuarios/${id}`); fetchUsuarios(); }
    catch (err) { alert('Erro ao excluir usuário.'); console.error(err); }
  };

  const handleEdit = (usuario: UsuarioLocal) => {
    setEditingUser(usuario);
    setEditUsername(usuario.username);
    setEditNomeCompleto(usuario.nome_completo || '');
    setEditSetorId(usuario.setor_id || '');
    setEditRole(usuario.role);
    setEditNewPassword('');
    setEditConfirmPassword('');
    setStatus({ type: '', message: '' });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editNewPassword || editConfirmPassword) {
      if (editNewPassword !== editConfirmPassword) { setStatus({ type: 'error', message: 'As novas senhas não coincidem.' }); return; }
      if (editNewPassword.length < 6) { setStatus({ type: 'error', message: 'A nova senha deve ter pelo menos 6 caracteres.' }); return; }
    }
    try {
      const payload: UsuarioFormPayload = { 
        username: editUsername, 
        nome_completo: editNomeCompleto, 
        setor_id: editSetorId || null, 
        role: editRole 
      };
      if (editNewPassword) payload.newPassword = editNewPassword;
      await api.put(`/usuarios/${editingUser.id}`, payload);
      setStatus({ type: 'success', message: 'Usuário atualizado com sucesso!' });
      fetchUsuarios();
      setTimeout(() => { setShowEditModal(false); setEditingUser(null); setStatus({ type: '', message: '' }); }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar usuário.';
      setStatus({ type: 'error', message });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    if (newPassword.length < 6) { setStatus({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' }); return; }
    try {
      await api.post('/auth/register', { username: newUsername, nome_completo: newNomeCompleto, setor_id: newSetorId || null, password: newPassword, role: newRole });
      setStatus({ type: 'success', message: `Usuário "${newUsername}" criado com sucesso!` });
      setNewUsername(''); setNewNomeCompleto(''); setNewSetorId(''); setNewPassword(''); setNewRole('solicitante');
      fetchUsuarios();
      setTimeout(() => { setShowModal(false); setStatus({ type: '', message: '' }); }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar usuário.';
      setStatus({ type: 'error', message });
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin')   return <Shield size={16} color="var(--cor-roxo)" />;
    if (role === 'tecnico') return <Wrench size={16} color="var(--cor-azul)" />;
    return <UserCheck size={16} color="var(--cor-verde)" />;
  };

  const getSetorNome = (setorId: string | null) => {
    if (!setorId) return '-';
    const setor = setores.find(s => s.id === setorId);
    return setor ? setor.nome : '-';
  };

  const abrirModal = () => {
    setShowModal(true);
    setStatus({ type: '', message: '' });
    setNewUsername(''); setNewNomeCompleto(''); setNewSetorId(''); setNewPassword(''); setNewRole('solicitante');
  };

  return (
    <div className={styles.pagina}>
      <div className={styles.cabecalho}>
        <div className={styles.cabecalhoInner}>
          <div className={styles.tituloCabecalho}>
            <div className={styles.icone}>
              <Users color="var(--cor-primaria)" size={20} />
            </div>
            <div>
              <h1 className={styles.titulo}>Gerenciar Usuários</h1>
              <p className={styles.subtitulo}>Visualize e gerencie os usuários do sistema</p>
            </div>
          </div>
          <button onClick={abrirModal} className={`botao-primario ${styles.btnNovo}`}>
            <Plus size={16} />
            <span className={styles.btnNovoLabel}>Novo Usuário</span>
          </button>
        </div>
      </div>

      <div className={`cartao ${styles.tabelaWrapper}`}>
        {loading ? (
          <div className={styles.carregando}>Carregando...</div>
        ) : usuarios.length === 0 ? (
          <div className={styles.vazio}>Nenhum usuário encontrado.</div>
        ) : (
          <div className={styles.tabelaContainer}>
            <table className={`${styles.tabela} ${styles.cardsDesktop}`}>
              <thead>
                <tr>
                  <th className={styles.tabelaTh}>Usuário</th>
                  <th className={styles.tabelaTh}>Nome Completo</th>
                  <th className={styles.tabelaTh}>Setor</th>
                  <th className={styles.tabelaTh}>Nível</th>
                  <th className={styles.tabelaTh}>Criado em</th>
                  <th className={`${styles.tabelaTh} ${styles.colAcoes}`}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className={styles.tabelaTr}>
                    <td className={styles.tabelaTd}>
                      <div className={styles.usuarioInfo}>
                        <div className={styles.usuarioAvatar}>
                          <span className={styles.usuarioAvatarLetra}>{usuario.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className={styles.usuarioNome}>{usuario.username}</span>
                      </div>
                    </td>
                    <td className={`${styles.tabelaTd} ${styles.colNomeCompleto}`}>{usuario.nome_completo || '-'}</td>
                    <td className={styles.tabelaTd}>
                      <div className={styles.tabelaSetorInfo}>
                        <Building size={14} color="var(--cor-cinza-400)" />
                        <span className={styles.tabelaSetorTexto}>{getSetorNome(usuario.setor_id)}</span>
                      </div>
                    </td>
                    <td className={styles.tabelaTd}>
                      <span className={`${styles.badge} ${getRoleBadgeColor(usuario.role)}`}>
                        {getRoleIcon(usuario.role)}
                        {getRoleLabel(usuario.role)}
                      </span>
                    </td>
                    <td className={`${styles.tabelaTd} ${styles.dataTexto}`}>
                      {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className={`${styles.tabelaTd} ${styles.acoesTd}`}>
                      <button onClick={() => handleEdit(usuario)} className={`${styles.btnAcao} ${styles.btnEditar}`} title="Editar"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(usuario.id, usuario.username)} className={`${styles.btnAcao} ${styles.btnExcluir}`} title="Excluir"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.cardsMobile}>
              {usuarios.map((usuario) => (
                <div key={usuario.id} className={styles.cardMobile}>
                  <div className={styles.cardMobileTopo}>
                    <div className={styles.cardMobileInfo}>
                      <div className={styles.usuarioAvatar}>
                        <span className={styles.usuarioAvatarLetra}>{usuario.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <span className={styles.cardMobileNome}>{usuario.username}</span>
                        <span className={styles.cardMobileNomeCompleto}>{usuario.nome_completo || '-'}</span>
                      </div>
                    </div>
                    <span className={`${styles.badge} ${getRoleBadgeColor(usuario.role)}`}>{getRoleLabel(usuario.role)}</span>
                  </div>
                  <div className={styles.cardMobileMeta}>
                    <div className={styles.cardMobileMetaItem}>
                      <Building size={14} color="var(--cor-cinza-400)" />
                      <span>{getSetorNome(usuario.setor_id)}</span>
                    </div>
                    <span className={styles.cardMobileData}>{new Date(usuario.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className={styles.cardMobileAcoes}>
                    <button onClick={() => handleEdit(usuario)} className={`${styles.btnAcao} ${styles.btnEditar}`}><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(usuario.id, usuario.username)} className={`${styles.btnAcao} ${styles.btnExcluir}`}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.legenda}>
        <h3 className={styles.legendaTitulo}>Legenda de Níveis:</h3>
        <div className={styles.legendaItens}>
          <span className={styles.legendaItem}><Shield size={14} color="var(--cor-roxo)" /> Administrador</span>
          <span className={styles.legendaItem}><Wrench size={14} color="var(--cor-azul)" /> Técnico</span>
          <span className={styles.legendaItem}><UserCheck size={14} color="var(--cor-verde)" /> Solicitante</span>
        </div>
      </div>

      {/* Modal Criar */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`cartao ${styles.modal}`}>
            <div className={styles.modalCabecalho}>
              <div className={styles.modalCabecalhoTitulo}>
                <div className={styles.modalIcone}><Plus color="var(--cor-primaria)" size={24} /></div>
                <h3 className={styles.modalTituloTexto}>Novo Usuário</h3>
              </div>
              <button onClick={() => setShowModal(false)} className={styles.btnFechar}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} className={styles.form}>
              {[
                { label: 'Nome de Usuário', value: newUsername, onChange: setNewUsername, placeholder: 'Ex: joao.silva', type: 'text', required: true },
                { label: 'Nome Completo', value: newNomeCompleto, onChange: setNewNomeCompleto, placeholder: 'Ex: João Silva', type: 'text', required: false },
              ].map(({ label, value, onChange, placeholder, type, required }) => (
                <div key={label} className={styles.formGrupo}>
                  <label className={styles.formLabel}>{label}</label>
                  <input type={type} className="campo" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
                </div>
              ))}
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Setor</label>
                <select className="campo" value={newSetorId} onChange={(e) => setNewSetorId(e.target.value)}>
                  <option value="">Selecione um setor</option>
                  {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Senha</label>
                <input type="password" className="campo" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Nível de Acesso</label>
                <select className="campo" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="solicitante">Solicitante</option>
                  <option value="tecnico">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {status.message && (
                <div className={`${styles.alertaForm} ${status.type === 'success' ? styles.alertaSucesso : styles.alertaErro}`}>
                  {status.type === 'success' ? <UserCheck size={18} /> : <AlertCircle size={18} />}
                  {status.message}
                </div>
              )}
              <div className={styles.botoesDuplos}>
                <button type="button" onClick={() => setShowModal(false)} className={`botao-secundario ${styles.btnModal}`}>Cancelar</button>
                <button type="submit" className={`botao-primario ${styles.btnModal}`}>Criar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && editingUser && (
        <div className={styles.modalOverlay}>
          <div className={`cartao ${styles.modal}`}>
            <div className={styles.modalCabecalho}>
              <div className={styles.modalCabecalhoTitulo}>
                <div className={styles.modalIcone}><Edit2 color="var(--cor-primaria)" size={24} /></div>
                <h3 className={styles.modalTituloTexto}>Editar Usuário</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className={styles.btnFechar}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateUser} className={styles.form}>
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Nome de Usuário</label>
                <input type="text" className="campo" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} required />
              </div>
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Nome Completo</label>
                <input type="text" className="campo" value={editNomeCompleto} onChange={(e) => setEditNomeCompleto(e.target.value)} />
              </div>
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Setor</label>
                <select className="campo" value={editSetorId} onChange={(e) => setEditSetorId(e.target.value)}>
                  <option value="">Selecione um setor</option>
                  {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className={styles.formGrupo}>
                <label className={styles.formLabel}>Nível de Acesso</label>
                <select className="campo" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  <option value="solicitante">Solicitante</option>
                  <option value="tecnico">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className={styles.divisorSenha}>
                <h4 className={styles.divisorSenhaTitulo}>Alterar Senha</h4>
                <div className={styles.formGrupo}>
                  <label className={styles.formLabel}>Nova Senha</label>
                  <input type="password" className="campo" placeholder="Mínimo 6 caracteres" value={editNewPassword} onChange={(e) => setEditNewPassword(e.target.value)} />
                </div>
                <div className={styles.formGrupo}>
                  <label className={styles.formLabel}>Confirmar Nova Senha</label>
                  <input type="password" className="campo" placeholder="Repita a nova senha" value={editConfirmPassword} onChange={(e) => setEditConfirmPassword(e.target.value)} />
                </div>
              </div>
              {status.message && (
                <div className={`${styles.alertaForm} ${status.type === 'success' ? styles.alertaSucesso : styles.alertaErro}`}>
                  {status.type === 'success' ? <UserCheck size={18} /> : <AlertCircle size={18} />}
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
