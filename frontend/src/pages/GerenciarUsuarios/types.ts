import { Usuario } from '../../types';

export interface UsuarioLocal extends Usuario {}

export interface SetorLocal {
  id: string;
  nome: string;
}

export interface StatusNotificacao {
  type: string;
  message: string;
}

export interface UsuarioFormPayload {
  username: string;
  nome_completo: string;
  setor_id: string | null;
  role: string;
  newPassword?: string;
}
