import { User, Building, Shield } from 'lucide-react';
import styles from './styles.module.css';

interface UserInfoProps {
  nome: string;
  setor: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  solicitante: 'Solicitante'
};

export default function UserInfo({ nome, setor, role }: UserInfoProps) {
  return (
    <div className={styles.container}>
      <div className={styles.avatar}>
        <User className={styles.avatarIcone} size={20} />
      </div>
      <div className={styles.info}>
        <span className={styles.nome}>{nome || 'Usuário'}</span>
        <div className={styles.badges}>
          <div className={styles.role}>
            <Shield className={styles.roleIcone} size={11} />
            <span className={styles.roleLabel}>{roleLabels[role] || role}</span>
          </div>
          <div className={styles.setor}>
            <Building className={styles.setorIcone} size={11} />
            <span className={styles.nomeSetor}>{setor || 'Sem setor'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
