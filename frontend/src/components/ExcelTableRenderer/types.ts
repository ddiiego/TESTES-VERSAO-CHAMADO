export interface ExcelCell {
  v: string | number | null;
  bg?: string;
  c?: string;
  b?: boolean;
  s?: number;
  w?: number;
  h?: number;
  cs?: number;
  rs?: number;
}

export interface ExcelRow {
  cells: ExcelCell[];
}

export interface ExcelTable {
  name: string;
  rows: ExcelRow[];
}

export interface ExcelData {
  __isExcel: boolean;
  tables: ExcelTable[];
  caption?: string;
}

export interface ExcelTableRendererProps {
  data: ExcelData;
  hideControls?: boolean;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  editable?: boolean;
  onCellChange?: (tableIdx: number, rowIdx: number, cellIdx: number, value: string) => void;
}
