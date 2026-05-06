import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, X, Maximize } from 'lucide-react';
import styles from './styles.module.css';
import { ExcelTableRendererProps } from './types';

const ExcelTableRenderer: React.FC<ExcelTableRendererProps> = ({
  data,
  hideControls = false,
  scale = 1.0,
  onScaleChange,
  editable = false,
  onCellChange,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fsScale, setFsScale] = useState(1.2);
  const [resizing, setResizing] = useState<{ type: 'col' | 'row', tableIdx: number, index: number, startPos: number, startSize: number } | null>(null);
  const [localData, setLocalData] = useState(data);

  React.useEffect(() => {
    setLocalData(data);
  }, [data]);

  if (!localData || !localData.__isExcel || !localData.tables) return null;

  const handleMouseDown = (e: React.MouseEvent, type: 'col' | 'row', tableIdx: number, index: number, currentSize: number) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      type,
      tableIdx,
      index,
      startPos: type === 'col' ? e.clientX : e.clientY,
      startSize: currentSize
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;
    const delta = (resizing.type === 'col' ? e.clientX : e.clientY) - resizing.startPos;
    const newSize = Math.max(20, resizing.startSize + delta / scale);
    
    setLocalData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const table = newData.tables[resizing.tableIdx];
      if (resizing.type === 'col') {
        table.rows.forEach((row: any) => {
          if (row.cells[resizing.index]) row.cells[resizing.index].w = newSize;
        });
      } else {
        table.rows[resizing.index].cells.forEach((cell: any) => {
          cell.h = newSize;
        });
      }
      return newData;
    });
  };

  const handleMouseUp = () => { 
    if (resizing && onCellChange) {
      // Sincroniza com o pai ao terminar o arraste
      onCellChange(resizing.tableIdx, 0, 0, localData.tables[0].rows[0].cells[0].v?.toString() || '');
    }
    setResizing(null); 
  };

  React.useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  const renderTable = (s: number, fs: boolean = false) => (
    <div className={styles.tabelaWrapper}>
      {localData.tables.map((table, tableIdx) => (
        <div key={tableIdx} className={styles.tabelaInner}>
          {table.name && table.name !== 'Sheet1' && table.name !== 'Colado' && (
            <h4 className={styles.nomePlanilha}>{table.name}</h4>
          )}
          <table className={styles.tabela} style={{ tableLayout: 'fixed', width: 'max-content' }}>
            <tbody>
              {table.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className={styles.linha} style={{ height: row.cells[0]?.h ? `${row.cells[0].h * s}px` : 'auto' }}>
                  {row.cells.map((cell, cellIdx) => {
                    if (cell.cs === 0 || cell.rs === 0) return null;
                    
                    const baseFontSize = cell.s ? Math.min(Math.max(cell.s, 10), 24) : 12;
                    const adaptiveFontSize = s < 1 
                      ? Math.max(10, baseFontSize * (s + (1 - s) * 0.6)) 
                      : baseFontSize * s;

                    const cellStyles = {
                      '--bg': cell.bg || 'transparent',
                      '--color': (cell.c && cell.c !== '#000000') ? cell.c : 'inherit',
                      '--weight': cell.b ? '800' : 'normal',
                      '--p-v': `${Math.max(0.5, 3 * s)}px`,
                      '--p-h': `${Math.max(1, 4 * s)}px`,
                      '--size': `${adaptiveFontSize}px`,
                      width: cell.w ? `${cell.w * s}px` : 'auto',
                      minWidth: `${20 * s}px`, 
                    } as React.CSSProperties;

                    return (
                      <td
                        key={cellIdx}
                        colSpan={cell.cs || 1}
                        rowSpan={cell.rs || 1}
                        className={`${styles.celula} ${editable ? styles.celulaEditavel : ''}`}
                        style={cellStyles}
                      >
                        {editable ? (
                          <div className={styles.editWrapper}>
                            <input 
                              className={styles.celulaInput}
                              value={cell.v || ''}
                              onChange={(e) => onCellChange?.(tableIdx, rowIdx, cellIdx, e.target.value)}
                            />
                            {/* Resize Handles */}
                            <div 
                              className={styles.resizerCol} 
                              onMouseDown={(e) => handleMouseDown(e, 'col', tableIdx, cellIdx, cell.w || 80)}
                            />
                            <div 
                              className={styles.resizerRow} 
                              onMouseDown={(e) => handleMouseDown(e, 'row', tableIdx, rowIdx, cell.h || 25)}
                            />
                          </div>
                        ) : cell.v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {!fs && !editable && (
        <button className={styles.btnExpandir} onClick={() => setIsFullScreen(true)}>
          <Maximize size={14} /> Expandir Planilha
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      {!hideControls && onScaleChange && (
        <div className={styles.barraZoom}>
          <div className={styles.barraZoomEsquerda}>
            <div className={styles.barraZoomTitulo}>
              <Maximize2 size={14} />
              <span className={styles.barraZoomLabel}>Escala Livre</span>
            </div>
            <div className={styles.barraZoomControles}>
              <button onClick={() => onScaleChange(Math.max(0.4, scale - 0.1))} className={styles.btnZoom} title="Reduzir">
                <ZoomOut size={16} />
              </button>
              <input
                type="range"
                min="0.4"
                max="2.0"
                step="0.05"
                value={scale}
                onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                className={styles.sliderZoom}
              />
              <button onClick={() => onScaleChange(Math.min(2.0, scale + 0.1))} className={styles.btnZoom} title="Ampliar">
                <ZoomIn size={16} />
              </button>
            </div>
            <div className={styles.percentualZoom}>{Math.round(scale * 100)}%</div>
          </div>
          <button onClick={() => onScaleChange(1.0)} className={styles.btnResetar}>
            <RotateCcw size={12} /> Resetar
          </button>
        </div>
      )}

      {renderTable(scale)}

      {isFullScreen && (
        <div className={styles.fsOverlay} onClick={() => setIsFullScreen(false)}>
          <div className={styles.fsHeader}>
            <div className={styles.fsZoomControles} onClick={e => e.stopPropagation()}>
               <button onClick={() => setFsScale(Math.max(0.5, fsScale - 0.1))} className={styles.btnFsZoom}><ZoomOut size={20} /></button>
               <span className={styles.fsScaleLabel}>{Math.round(fsScale * 100)}%</span>
               <button onClick={() => setFsScale(Math.min(3, fsScale + 0.1))} className={styles.btnFsZoom}><ZoomIn size={20} /></button>
            </div>
            <button className={styles.btnFsFechar} onClick={() => setIsFullScreen(false)}>
              <X size={32} />
            </button>
          </div>
          <div className={styles.fsBody} onClick={e => e.stopPropagation()}>
            <div className={styles.fsTabelaWrapper}>
               {renderTable(fsScale, true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelTableRenderer;
