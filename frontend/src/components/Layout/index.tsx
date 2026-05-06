import { useState, useEffect, ReactNode, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, Ticket, Home, Archive, Building, Users, Menu, X,
  Bell, Volume2, VolumeX, Lock, Trophy, TrendingUp, BookOpen,
  CheckCircle, User, Shield,
} from 'lucide-react';
import api from '../../api';
import { supabase } from '../../supabase';
import Toaster from '../Toaster';
import UserInfo from '../UserInfo';
import { toast } from '../../utils/toast';
import styles from './styles.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [nome, setNome] = useState(() => localStorage.getItem('nomeCompleto') || '');
  const [setor, setSetor] = useState(() => localStorage.getItem('setorNome') || '');
  const [role, setRole] = useState(() => localStorage.getItem('userRole') || 'solicitante');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [somAtivado, setSomAtivado] = useState(() => {
    const saved = localStorage.getItem('somNotificacao');
    return saved !== null ? saved === 'true' : true;
  });
  const somAtivadoRef = useRef(somAtivado);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => { somAtivadoRef.current = somAtivado; }, [somAtivado]);

  useEffect(() => {
    api.get('/auth/me').then((res) => {
      if (res.data?.nome_completo) { setNome(res.data.nome_completo); localStorage.setItem('nomeCompleto', res.data.nome_completo); }
      if (res.data?.setor_nome)   { setSetor(res.data.setor_nome);   localStorage.setItem('setorNome', res.data.setor_nome); }
      if (res.data?.role)         { setRole(res.data.role);           localStorage.setItem('userRole', res.data.role); }
    }).catch(() => {});
  }, []);

  const playNotificationSound = () => {
    if (!somAtivadoRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      playNote(659.25, now, 0.8);
      playNote(830.61, now + 0.08, 0.8);
      playNote(987.77, now + 0.16, 0.8);
      playNote(1318.51, now + 0.24, 1.0);
      setTimeout(() => ctx.close(), 1500);
    } catch (err) {
      console.warn('AudioContext error:', err);
    }
  };

  useEffect(() => {
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('userRole');
    if (!username) return;

    api.get('/notificacoes').then(res => setNotificacoes(res.data || [])).catch(() => {});

    const channel = supabase
      .channel('notificacoes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `usuario=eq.${username}` }, (payload) => {
        const notif = payload.new as any;
        setNotificacoes(prev => [notif, ...prev]);
        playNotificationSound();
        const onClick = notif.chamado_id ? () => {
          const destino = (role === 'admin' || role === 'tecnico') ? '/chamados' : '/meus-chamados';
          const params = new URLSearchParams({ chamado_id: notif.chamado_id });
          if (notif.titulo?.includes('Mensagem')) params.set('action', 'chat');
          navigate(`${destino}?${params.toString()}`);
        } : undefined;
        toast.info(notif.mensagem || '', notif.titulo || 'Nova notificação', onClick);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificacoes', filter: `usuario=eq.${username}` }, (payload) => {
        const updated = payload.new as any;
        if (updated.lida) setNotificacoes(prev => prev.filter(n => n.id !== updated.id));
      })
      .subscribe();

    let channelChamados: any = null;
    if (userRole === 'tecnico' || userRole === 'admin') {
      channelChamados = supabase
        .channel('notificacoes-chamados-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
          const notif = payload.new as any;
          if (notif.chamado_id) {
            setNotificacoes(prev => {
              if (prev.find(n => n.id === notif.id)) return prev;
              return [notif, ...prev];
            });
            playNotificationSound();
            const onClick = () => {
              const destino = (role === 'admin' || role === 'tecnico') ? '/chamados' : '/meus-chamados';
              const params = new URLSearchParams({ chamado_id: notif.chamado_id });
              if (notif.titulo?.includes('Mensagem')) params.set('action', 'chat');
              navigate(`${destino}?${params.toString()}`);
            };
            toast.info(notif.mensagem || '', notif.titulo || 'Nova notificação', onClick);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificacoes' }, (payload) => {
          const updated = payload.new as any;
          if (updated.lida) setNotificacoes(prev => prev.filter(n => n.id !== updated.id));
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (channelChamados) supabase.removeChannel(channelChamados);
    };
  }, []);

  const marcarLida = async (id: number) => {
    try {
      await api.patch(`/notificacoes/${id}/lida`);
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const marcarTodasLidas = async () => {
    try {
      await api.patch('/notificacoes/todas-lidas');
      setNotificacoes([]);
      setShowNotif(false);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('nomeCompleto');
    localStorage.removeItem('setorNome');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError('Preencha todos os campos.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('As senhas não coincidem.'); return; }
    if (newPassword.length < 6) { setPasswordError('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordSuccess('Senha alterada com sucesso!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { setShowPasswordModal(false); setPasswordSuccess(''); setPasswordError(''); }, 1500);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Erro ao alterar senha.');
    }
  };

  const isAdmin = role === 'admin';
  const isTecnico = role === 'tecnico';

  const menuItems = [
    { icon: Ticket, label: 'Novo Chamado', path: '/meus-chamados?open_new=true', activePath: '/meus-chamados' },
    { icon: CheckCircle, label: (isAdmin || isTecnico) ? 'Chamados Ativos' : 'Meus Chamados', path: (isAdmin || isTecnico) ? '/chamados' : '/meus-chamados', activePath: (isAdmin || isTecnico) ? '/chamados' : '/meus-chamados' },
    { icon: BookOpen, label: 'Chromebooks/Provas', path: '/provas', activePath: '/provas' },
    ...((isAdmin || isTecnico) ? [
      { icon: Archive, label: 'Histórico Suporte', path: '/fechados', activePath: '/fechados' },
      { icon: CheckCircle, label: 'Provas Concluídas', path: '/fechados-provas', activePath: '/fechados-provas' },
    ] : []),
    ...(isTecnico ? [{ icon: TrendingUp, label: 'Meu Desempenho', path: '/meu-desempenho', activePath: '/meu-desempenho' }] : []),
    ...(isAdmin ? [
      { icon: Trophy, label: 'Ranking', path: '/ranking', activePath: '/ranking' },
      { icon: Building, label: 'Setores', path: '/setores', activePath: '/setores' },
      { icon: Users, label: 'Cadastro de Usuários', path: '/usuarios', activePath: '/usuarios' },
    ] : []),
  ];

  const roleLabels: Record<string, string> = { admin: 'Administrador', tecnico: 'Técnico', solicitante: 'Solicitante' };

  return (
    <div className={styles.app}>
      {/* Sidebar desktop */}
      <aside className={styles.sidebar}>
        <button
          onClick={() => navigate(isAdmin || isTecnico ? '/chamados' : '/meus-chamados')}
          className={styles.sidebarLogo}
        >
          <Home className={styles.sidebarLogoIcone} size={20} />
          <span className={styles.sidebarLogoTexto}>
            {isAdmin ? 'Painel de Gerência' : 'Sistema de Chamados'}
          </span>
        </button>

        <nav className={styles.sidebarNav}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`${styles.navItem} ${location.pathname === item.activePath ? styles.navItemAtivo : ''}`}
            >
              <item.icon size={17} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarRodape}>
          <UserInfo nome={nome} setor={setor} role={role} />

          <button onClick={() => setShowPasswordModal(true)} className={styles.btnRodape}>
            <Lock size={15} style={{ flexShrink: 0 }} /> Senha
          </button>
          <button onClick={handleLogout} className={`${styles.btnRodape} ${styles.btnSair}`}>
            <LogOut size={15} style={{ flexShrink: 0 }} /> Sair
          </button>
        </div>
      </aside>

      {/* Lado direito */}
      <div className={styles.conteudoDireito}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            {/* Logo mobile */}
            <button
              onClick={() => navigate(isAdmin || isTecnico ? '/chamados' : '/meus-chamados')}
              className={styles.headerLogoMobile}
            >
              <Home color="#2563eb" size={20} />
              <h1 className={styles.headerLogoTexto}>{isAdmin ? 'Gerência' : 'Chamados'}</h1>
            </button>

            <div className={styles.headerSpacer} />

            <div className={styles.headerAcoes}>
              {/* Som */}
              <button
                onClick={() => { const v = !somAtivado; setSomAtivado(v); localStorage.setItem('somNotificacao', String(v)); }}
                className={styles.btnHeader}
                title={somAtivado ? 'Som ativado' : 'Som desativado'}
              >
                {somAtivado ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>

              {/* Notificações */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowNotif(!showNotif)} className={styles.btnHeader}>
                  <Bell size={20} />
                  {notificacoes.length > 0 && (
                    <span className={styles.badgeNotif}>{notificacoes.length}</span>
                  )}
                </button>

                {showNotif && (
                  <div className={styles.painelNotif}>
                    <div className={styles.painelNotifHeader}>
                      <h3 className={styles.painelNotifTitulo}>Notificações</h3>
                      {notificacoes.length > 0 && (
                        <button onClick={marcarTodasLidas} className={styles.btnLimparTudo}>Limpar Tudo</button>
                      )}
                    </div>
                    <div className={styles.painelNotifLista}>
                      {notificacoes.length === 0 ? (
                        <div className={styles.notifVazia}>
                          <Bell size={32} className={styles.notifVaziaIcone} />
                          <p className={styles.notifVaziaTexto}>Tudo limpo por aqui!</p>
                        </div>
                      ) : (
                        notificacoes.map((n) => {
                          const isChat = n.titulo?.includes('Mensagem');
                          const handleClick = () => {
                            marcarLida(n.id);
                            setShowNotif(false);
                            if (n.chamado_id) {
                              const destino = (role === 'admin' || role === 'tecnico') ? '/chamados' : '/meus-chamados';
                              const params = new URLSearchParams({ chamado_id: n.chamado_id });
                              if (isChat) params.set('action', 'chat');
                              navigate(`${destino}?${params.toString()}`);
                            }
                          };
                          return (
                            <div key={n.id} className={styles.notifItem} onClick={handleClick}>
                              <div className={styles.notifItemTopo}>
                                <h4 className={styles.notifItemTitulo}>{n.titulo}</h4>
                                <span className={styles.notifItemHora}>
                                  {new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className={styles.notifItemMensagem}>{n.mensagem}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Menu mobile */}
              <div className={styles.menuMobileWrapper}>
                <button onClick={() => setMenuOpen(!menuOpen)} className={styles.btnHeader}>
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {menuOpen && (
                  <div className={styles.menuMobileDropdown}>
                    <div className={styles.menuMobileUsuario}>
                      <p className={styles.menuMobileNome}>{nome}</p>
                      <p className={styles.menuMobileSetor}>{setor || 'Sem setor'}</p>
                      <p className={styles.menuMobileRole}>{roleLabels[role] || role}</p>
                    </div>
                    {menuItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); setMenuOpen(false); }}
                        className={`${styles.menuMobileItem} ${location.pathname === item.activePath ? styles.menuMobileItemAtivo : ''}`}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </button>
                    ))}
                    <div className={styles.menuMobileDivisor}>
                      <button onClick={() => { setShowPasswordModal(true); setMenuOpen(false); }} className={styles.menuMobileItem}>
                        <Lock size={16} /> Alterar Senha
                      </button>
                      <button onClick={handleLogout} className={`${styles.menuMobileItem} ${styles.menuMobileSair}`}>
                        <LogOut size={16} /> Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>

      <Toaster />

      {/* Modal de Senha */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={`cartao ${styles.modalSenha}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalSenhaCabecalho}>
              <div className={styles.modalSenhaTitulo}>
                <div className={styles.modalSenhaIconeContainer}>
                  <Lock color="var(--cor-primaria)" size={20} />
                </div>
                <h2 className={styles.modalSenhaTituloTexto}>Alterar Senha</h2>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className={styles.btnFecharModal}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalSenhaFormulario}>
              <div className={styles.campoGrupo}>
                <label className={styles.campoLabel}>Senha Atual</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={styles.campoSenha} placeholder="••••••••" />
              </div>
              <div className={styles.campoGrupo}>
                <label className={styles.campoLabel}>Nova Senha</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={styles.campoSenha} placeholder="••••••••" />
              </div>
              <div className={styles.campoGrupo}>
                <label className={styles.campoLabel}>Confirmar Senha</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={styles.campoSenha} placeholder="••••••••" />
              </div>
              {passwordError && <p className={styles.mensagemErro}>{passwordError}</p>}
              {passwordSuccess && <p className={styles.mensagemSucesso}>{passwordSuccess}</p>}
              <button onClick={handleChangePassword} className="botao-primario" style={{ width: '100%', padding: '0.75rem' }}>
                Alterar Senha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
