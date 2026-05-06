import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { toast as toastManager, ToastItem, ToastType } from '../../utils/toast';
import styles from './styles.module.css';

const ICONES: Record<ToastType, React.ElementType> = {
  info:    Info,
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
};

interface ToastCardProps {
  item: ToastItem;
  onClose: () => void;
}

function ToastCard({ item, onClose }: ToastCardProps) {
  const [visivel, setVisivel] = useState(false);
  const Icone = ICONES[item.type];

  useEffect(() => {
    const t = setTimeout(() => setVisivel(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClick = () => {
    if (item.onClick) {
      item.onClick();
      onClose();
    }
  };

  return (
    <div
      className={`${styles.card} ${visivel ? styles.cardEntrar : styles.cardSaindo} ${item.onClick ? styles.cardClicavel : ''}`}
      data-type={item.type}
      onClick={item.onClick ? handleClick : undefined}
    >
      <div className={`${styles.cardCorpo} ${item.onClick ? styles.cardCorpoClicavel : ''}`} data-type={item.type}>
        <Icone size={18} className={styles.icone} data-type={item.type} />
        <div className={styles.conteudo}>
          {item.title && (
            <p className={styles.titulo} data-type={item.type}>{item.title}</p>
          )}
          <p className={styles.mensagem}>{item.message}</p>
          {item.onClick && (
            <p className={styles.dica}>Clique para abrir →</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={styles.fechar}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = toastManager.subscribe(setItems);
    return () => { unsub(); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className={styles.container}>
      {items.length > 1 && (
        <div className={styles.fecharTodosContainer}>
          <button
            onClick={() => toastManager.dismissAll()}
            className={styles.fecharTodosBtn}
          >
            Fechar todos ({items.length})
          </button>
        </div>
      )}
      {items.map(item => (
        <ToastCard
          key={item.id}
          item={item}
          onClose={() => toastManager.dismiss(item.id)}
        />
      ))}
    </div>
  );
}
