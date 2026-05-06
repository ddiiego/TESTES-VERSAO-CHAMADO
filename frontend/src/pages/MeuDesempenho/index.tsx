import { useState, useEffect } from 'react';
import { Star, TrendingUp, Calendar, Ticket } from 'lucide-react';
import api from '../../api';
import { formatDateShort, getMotivationalMessage } from '../../utils/formatters';
import styles from './styles.module.css';

interface Desempenho {
  username: string;
  nome_completo: string;
  media_diaria: number;
  media_semanal: number;
  media_mensal: number;
  media_semestral: number;
  total_chamados: number;
  chamados_mes: number;
  periodo_inicio: string;
}

export default function MeuDesempenho() {
  const [dados, setDados] = useState<Desempenho | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ranking/meu-desempenho')
      .then(res => setDados(res.data))
      .catch(err => console.error('Erro ao buscar desempenho:', err))
      .finally(() => setLoading(false));
  }, []);

  const getMediaClass = (media: number): string => {
    if (media >= 5) return styles.mediaExcelente;
    if (media >= 4) return styles.mediaBom;
    if (media >= 3) return styles.mediaRegular;
    if (media > 0) return styles.mediaBaixo;
    return styles.mediaSemDados;
  };

  const getCardClass = (media: number): string => {
    if (media >= 5) return styles.cardExcelente;
    if (media >= 4) return styles.cardBom;
    if (media >= 3) return styles.cardRegular;
    if (media > 0) return styles.cardBaixo;
    return styles.cardSemDados;
  };

  const renderStars = (nota: number) => (
    <div className={styles.estrelas}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Star
          key={n}
          size={16}
          className={n <= Math.round(nota) ? styles.estrelaAtiva : styles.estrelaVazia}
        />
      ))}
    </div>
  );

  if (loading) {
    return <div className={styles.carregando}>Carregando...</div>;
  }

  if (!dados) {
    return <div className={styles.vazio}>Não foi possível carregar seus dados de desempenho.</div>;
  }

  const motivacao = getMotivationalMessage(dados.media_mensal);

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div className={styles.icone}>
          <TrendingUp color="var(--cor-primaria)" size={20} />
        </div>
        <div>
          <h1 className={styles.titulo}>Meu Desempenho</h1>
          <p className={styles.subtitulo}>
            Suas avaliações e métricas de atendimento
            {dados.periodo_inicio && dados.periodo_inicio !== '2000-01-01T00:00:00.000Z' && (
              <span className={styles.periodoDestaque}>
                (desde {formatDateShort(dados.periodo_inicio)})
              </span>
            )}
          </p>
        </div>
      </header>

      <div className={`cartao ${styles.motivacao}`}>
        <span className={styles.motivacaoEmoji}>{motivacao.emoji}</span>
        <div>
          <p className={styles.motivacaoTexto}>{motivacao.text}</p>
          <p className={styles.motivacaoNome}>{dados.nome_completo}</p>
        </div>
      </div>

      <div className={styles.gridMedias}>
        <div className={`${styles.cardMedia} ${getCardClass(dados.media_diaria)}`}>
          <div className={styles.cardMediaCabecalho}>
            <Calendar size={14} color="var(--cor-cinza-400)" />
            <span className={styles.cardMediaLabel}>Hoje</span>
          </div>
          <p className={`${styles.cardMediaValor} ${getMediaClass(dados.media_diaria)}`}>
            {dados.media_diaria > 0 ? dados.media_diaria.toFixed(1) : '-'}
          </p>
          {dados.media_diaria > 0 && renderStars(dados.media_diaria)}
        </div>

        <div className={`${styles.cardMedia} ${getCardClass(dados.media_semanal)}`}>
          <div className={styles.cardMediaCabecalho}>
            <Calendar size={14} color="var(--cor-cinza-400)" />
            <span className={styles.cardMediaLabel}>Semanal</span>
          </div>
          <p className={`${styles.cardMediaValor} ${getMediaClass(dados.media_semanal)}`}>
            {dados.media_semanal > 0 ? dados.media_semanal.toFixed(1) : '-'}
          </p>
          {dados.media_semanal > 0 && renderStars(dados.media_semanal)}
        </div>

        <div className={`${styles.cardMedia} ${getCardClass(dados.media_mensal)}`}>
          <div className={styles.cardMediaCabecalho}>
            <Calendar size={14} color="var(--cor-cinza-400)" />
            <span className={styles.cardMediaLabel}>Mensal</span>
          </div>
          <p className={`${styles.cardMediaValor} ${getMediaClass(dados.media_mensal)}`}>
            {dados.media_mensal > 0 ? dados.media_mensal.toFixed(1) : '-'}
          </p>
          {dados.media_mensal > 0 && renderStars(dados.media_mensal)}
        </div>

        <div className={`${styles.cardMedia} ${getCardClass(dados.media_semestral)}`}>
          <div className={styles.cardMediaCabecalho}>
            <Calendar size={14} color="var(--cor-cinza-400)" />
            <span className={styles.cardMediaLabel}>Semestral</span>
          </div>
          <p className={`${styles.cardMediaValor} ${getMediaClass(dados.media_semestral)}`}>
            {dados.media_semestral > 0 ? dados.media_semestral.toFixed(1) : '-'}
          </p>
          {dados.media_semestral > 0 && renderStars(dados.media_semestral)}
        </div>
      </div>

      <div className="cartao">
        <h3 className={styles.resumoTitulo}>
          <Ticket size={16} color="var(--cor-primaria)" />
          Resumo de Chamados
        </h3>
        <div className={styles.gridResumo}>
          <div className={styles.resumoCard}>
            <p className={styles.resumoLabel}>Total Avaliados</p>
            <p className={styles.resumoValor}>{dados.total_chamados}</p>
          </div>
          <div className={styles.resumoCard}>
            <p className={styles.resumoLabel}>Este Mês</p>
            <p className={styles.resumoValorDestaque}>{dados.chamados_mes}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
