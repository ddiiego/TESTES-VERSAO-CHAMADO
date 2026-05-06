import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Lock, User, AlertCircle } from 'lucide-react';
import styles from './styles.module.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, role, nome_completo, setor_id, setor_nome } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('userRole', role || 'solicitante');
      localStorage.setItem('nomeCompleto', nome_completo || '');
      localStorage.setItem('username', username); // necessário para Realtime
      if (setor_id) localStorage.setItem('setorId', setor_id.toString());
      if (setor_nome) localStorage.setItem('setorNome', setor_nome);

      switch (role) {
        case 'admin':      navigate('/gerencia'); break;
        case 'tecnico':    navigate('/chamados'); break;
        default:           navigate('/meus-chamados'); break;
      }
    } catch {
      setError('Credenciais inválidas ou erro no servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pagina}>
      <div className={`cartao ${styles.card}`}>
        <div className={styles.cabecalho}>
          <div className={styles.iconeContainer}>
            <Lock size={24} />
          </div>
          <h1 className={styles.titulo}>Login</h1>
          <p className={styles.subtitulo}>Sistema de Chamados</p>
        </div>

        <form onSubmit={handleLogin} className={styles.formulario}>
          <div className={styles.grupo}>
            <label className={styles.label}>Usuário</label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcone} size={16} />
              <input
                type="text"
                className={`campo ${styles.inputComIcone}`}
                placeholder="Ex: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.grupo}>
            <label className={styles.label}>Senha</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcone} size={16} />
              <input
                type="password"
                className={`campo ${styles.inputComIcone}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className={styles.erroContainer}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`botao-primario ${styles.btnEntrar}`}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
