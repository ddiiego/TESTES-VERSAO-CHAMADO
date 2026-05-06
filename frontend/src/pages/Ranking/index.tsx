import { useState, useEffect } from 'react';
import { Trophy, Star, RotateCcw, Trash2, Medal, Users, Award } from 'lucide-react';
import api from '../../api';
import type { RankingTecnico } from '../../types';
import { formatDateShort } from '../../utils/formatters';
import styles from './styles.module.css';

export default function Ranking() {
  const [tecnicos, setTecnicos] = useState<RankingTecnico[]>([]);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ranking');
      setTecnicos(res.data.tecnicos || []);
      setPeriodoInicio(res.data.periodo_inicio || '');
    } catch (err) {
      console.error('Erro ao buscar ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRanking(); }, []);

  const handleReset = async () => {
    if (!confirm('Deseja iniciar um NOVO PERÍODO de ranking?\n\nAs médias serão recalculadas a partir de agora.\nOs dados históricos serão preservados.')) return;
    setActionLoading(true);
    try {
      await api.post('/ranking/reset');
      fetchRanking();
    } catch {
      alert('Erro ao resetar período.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLimpar = async () => {
    if (!confirm('⚠️ AÇÃO IRREVERSÍVEL!\n\nDeseja APAGAR todas as notas de avaliação do período atual?\n\nIsso não pode ser desfeito.')) return;
    if (!confirm('Confirma que deseja realmente apagar todas as notas?')) return;
    setActionLoading(true);
    try {
      await api.delete('/ranking/limpar');
      fetchRanking();
    } catch {
      alert('Erro ao limpar notas.');
    } finally {
      setActionLoading(false);
    }
  };

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy size={20} color="#eab308" />;
    if (index === 1) return <Medal size={20} color="var(--cor-cinza-400)" />;
    if (index === 2) return <Award size={20} color="var(--cor-aviso)" />;
    return <span className={styles.posicaoNumero}>{index + 1}</span>;
  };

  const getMediaClass = (media: number): string => {
    if (media >= 5) return styles.mediaExcelente;
    if (media >= 4) return styles.mediaBom;
    if (media >= 3) return styles.mediaRegular;
    if (media > 0) return styles.mediaBaixo;
    return styles.mediaSemDados;
  };

  const renderStars = (nota: number) => (
    <div className={styles.estrelas}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= Math.round(nota) ? styles.estrelaAtiva : styles.estrelaVazia}
        />
      ))}
    </div>
  );

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div className={styles.tituloArea}>
          <div className={styles.icone}>
            <Trophy color="#ca8a04" size={20} />
          </div>
          <div>
            <h1 className={styles.titulo}>Ranking de Técnicos</h1>
            <p className={styles.subtitulo}>
              Avaliações e desempenho da equipe
              {periodoInicio && periodoInicio !== '2000-01-01T00:00:00.000Z' && (
                <span className={styles.periodoDestaque}>
                  (desde {formatDateShort(periodoInicio)})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className={styles.acoes}>
          <button
            onClick={handleReset}
            disabled={actionLoading}
            className="botao-secundario"
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RotateCcw size={14} /> Novo Período
          </button>
          <button
            onClick={handleLimpar}
            disabled={actionLoading}
            className={`botao-secundario ${styles.btnLimpar}`}
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Trash2 size={14} /> Limpar Notas
          </button>
        </div>
      </header>

      <div className="cartao">
        {loading ? (
          <div className={styles.carregando}>Carregando ranking...</div>
        ) : tecnicos.length === 0 ? (
          <div className={styles.vazio}>
            <Users className={styles.vazioIcone} size={28} />
            <p>Nenhum técnico encontrado.</p>
          </div>
        ) : (
          <>
            <div className={styles.cardsDesktop}>
              <div className={styles.tabelaContainer}>
                <table className={styles.tabela}>
                  <thead>
                    <tr>
                      <th className={styles.tabelaTh} style={{ width: '3rem' }}>#</th>
                      <th className={styles.tabelaTh}>Técnico</th>
                      <th className={`${styles.tabelaTh} ${styles.tabelaThCentro}`}>Diária</th>
                      <th className={`${styles.tabelaTh} ${styles.tabelaThCentro}`}>Semanal</th>
                      <th className={`${styles.tabelaTh} ${styles.tabelaThCentro}`}>Mensal</th>
                      <th className={`${styles.tabelaTh} ${styles.tabelaThCentro}`}>Semestral</th>
                      <th className={`${styles.tabelaTh} ${styles.tabelaThCentro}`}>Chamados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tecnicos.map((t, i) => (
                      <tr key={t.username} className={`${styles.tabelaTr} ${i < 3 ? styles.tabelaTrTop3 : ''}`}>
                        <td className={styles.tabelaTd}>{getPositionIcon(i)}</td>
                        <td className={styles.tabelaTd}>
                          <div className={styles.tecnicoInfo}>
                            <div className={styles.tecnicoAvatar}>
                              {t.nome_completo.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className={styles.tecnicoNome}>{t.nome_completo}</span>
                              <span className={styles.tecnicoUsername}>@{t.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className={styles.tabelaTdCentro}>
                          <span className={`${styles.mediaValor} ${getMediaClass(t.media_diaria)}`}>
                            {t.media_diaria > 0 ? t.media_diaria.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className={styles.tabelaTdCentro}>
                          <span className={`${styles.mediaValor} ${getMediaClass(t.media_semanal)}`}>
                            {t.media_semanal > 0 ? t.media_semanal.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className={styles.tabelaTdCentro}>
                          <div className={styles.mediaCelula}>
                            <span className={`${styles.mediaValor} ${getMediaClass(t.media_mensal)}`}>
                              {t.media_mensal > 0 ? t.media_mensal.toFixed(1) : '-'}
                            </span>
                            {t.media_mensal > 0 && renderStars(t.media_mensal)}
                          </div>
                        </td>
                        <td className={styles.tabelaTdCentro}>
                          <span className={`${styles.mediaValor} ${getMediaClass(t.media_semestral)}`}>
                            {t.media_semestral > 0 ? t.media_semestral.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className={styles.tabelaTdCentro}>
                          <span className={styles.chamadosTotal}>{t.total_chamados}</span>
                          <span className={styles.chamadosMes}>({t.chamados_mes} mês)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.cardsMobile}>
              {tecnicos.map((t, i) => (
                <div key={t.username} className={`${styles.cardMobile} ${i < 3 ? styles.cardMobileTop3 : ''}`}>
                  <div className={styles.cardMobileTopo}>
                    <div className={styles.cardMobileInfo}>
                      <div className={styles.cardMobileAvatarGrupo}>
                        {getPositionIcon(i)}
                        <div className={styles.tecnicoAvatar}>
                          {t.nome_completo.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <span className={styles.cardMobileNome}>{t.nome_completo}</span>
                        <span className={styles.cardMobileChamados}>{t.total_chamados} chamados</span>
                      </div>
                    </div>
                    {t.media_mensal > 0 && renderStars(t.media_mensal)}
                  </div>
                  <div className={styles.gridMedias}>
                    <div>
                      <p className={styles.gridMediaLabel}>Dia</p>
                      <p className={`${styles.gridMediaValor} ${getMediaClass(t.media_diaria)}`}>
                        {t.media_diaria > 0 ? t.media_diaria.toFixed(1) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className={styles.gridMediaLabel}>Sem</p>
                      <p className={`${styles.gridMediaValor} ${getMediaClass(t.media_semanal)}`}>
                        {t.media_semanal > 0 ? t.media_semanal.toFixed(1) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className={styles.gridMediaLabel}>Mês</p>
                      <p className={`${styles.gridMediaValor} ${getMediaClass(t.media_mensal)}`}>
                        {t.media_mensal > 0 ? t.media_mensal.toFixed(1) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className={styles.gridMediaLabel}>Sem.</p>
                      <p className={`${styles.gridMediaValor} ${getMediaClass(t.media_semestral)}`}>
                        {t.media_semestral > 0 ? t.media_semestral.toFixed(1) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
