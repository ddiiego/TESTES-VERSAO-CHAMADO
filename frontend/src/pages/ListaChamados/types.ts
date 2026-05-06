import { Chamado, ChatMessage } from '../../types';
import { ExcelData } from '../../components/ExcelTableRenderer/types';

export interface ListaChamadosProps {
  tipo?: 'suporte' | 'provas';
}

export { type Chamado, type ChatMessage, type ExcelData };

export interface TecnicoSimplificado {
  username: string;
  nome_completo: string;
}
