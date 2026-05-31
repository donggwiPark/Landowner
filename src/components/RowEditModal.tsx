import React, { useState, useEffect } from 'react';
import { Columns, Plus, Save, X, Calendar, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';

interface RowEditModalProps {
  isOpen: boolean;
  columns: string[];
  initialValues: Record<string, any> | null; // null if Adding, filled record if Editing
  onClose: () => void;
  onSave: (formData: Record<string, any>) => void;
}

export default function RowEditModal({ isOpen, columns, initialValues, onClose, onSave }: RowEditModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const isEditMode = initialValues !== null;

  // Initialize form data when modal opens or target row changes
  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        setFormData({ ...initialValues });
      } else {
        // Generate blank initial records with default values
        const blankData: Record<string, any> = {};
        columns.forEach(col => {
          // If it's an ID column, maybe pre-generate a code
          if (col.toLowerCase().includes('id') || col.includes('일련번호') || col.includes('고유번호') || col.includes('학번')) {
            const prefix = col.includes('비품') ? 'EQ' : col.includes('상품') ? 'FR' : 'ST';
            const randomNum = Math.floor(100 + Math.random() * 900);
            blankData[col] = `${prefix}-${randomNum}`;
          } else if (col.includes('일자') || col.includes('기한') || col.toLowerCase().includes('date')) {
            // default to today's date
            const today = new Date().toISOString().split('T')[0];
            blankData[col] = today;
          } else if (col.includes('수량') || col.includes('단가') || col.includes('원')) {
            blankData[col] = '0';
          } else {
            blankData[col] = '';
          }
        });
        setFormData(blankData);
      }
    }
  }, [isOpen, columns, initialValues]);

  // If not open, returning null enables unmounting layout
  if (!isOpen) return null;

  const handleInputChange = (column: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Helper to detect if a column is the ID Key column
  const isIdColumn = (col: string) => {
    const lowered = col.toLowerCase();
    return lowered === 'id' || 
           lowered.includes('코드') || 
           col.includes('번호') || 
           col.includes('일련번호') || 
           col.includes('고유번호') || 
           col.includes('학번');
  };

  // Helper to determine optimal input type
  const getInputTypeAndIcon = (col: string) => {
    if (col.includes('일자') || col.includes('기한') || col.toLowerCase().includes('date')) {
      return { type: 'date', icon: <Calendar className="w-4 h-4 text-gray-500" /> };
    }
    return { type: 'text', icon: <ClipboardList className="w-4 h-4 text-gray-500" /> };
  };

  return (
    <div id="row-modal-wrapper" className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop animation */}
      <motion.div
        id="row-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Floating Bottom Sheet animation */}
      <motion.div
        id="row-modal-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 24, stiffness: 210 }}
        className="relative bg-white rounded-t-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] z-10 border-t border-slate-100 overflow-hidden"
      >
        {/* iOS Native styled Top bar handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3.5 shrink-0" />

        {/* Modal Header */}
        <div className="px-6 pb-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm shadow-blue-500/10">
              <Columns className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 tracking-tight font-display">
                {isEditMode ? '명부 상세 정보 수정' : '신규 소유자 데이터 등록'}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mt-0.5">
                {isEditMode 
                  ? '행 데이터를 세로 방향 필드 형태로 상세하게 확인하고 일괄 편집합니다.' 
                  : '가장 아래 행에 추가될 새로운 필자/소유자 규격 명부입니다.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 p-2 rounded-full transition"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body Scroll area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-4">
            {columns.map((col) => {
              const isId = isIdColumn(col);
              const readOnly = isEditMode && isId; // ID/Index is unmodifiable in edit mode
              const { type, icon } = getInputTypeAndIcon(col);

              return (
                <div key={col} id={`input-group-${col}`} className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                      {col}
                      {isId && <span className="text-xs text-blue-500 font-mono font-medium opacity-80">(고유 키)</span>}
                    </label>
                    {readOnly && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-150 animate-pulse">
                        변경 불가 고유ID
                      </span>
                    )}
                  </div>
                  
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400">
                      {icon}
                    </div>
                    <input
                      type={type}
                      disabled={readOnly}
                      value={formData[col] ?? ''}
                      onChange={(e) => handleInputChange(col, e.target.value)}
                      className={`w-full text-sm pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition duration-150 shadow-xs ${
                        readOnly 
                          ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed font-mono' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 hover:border-slate-300'
                      }`}
                      placeholder={`${col} 항목의 수치 혹은 텍스트 정보를 입력하세요`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky action pane inside scroll for native bottom sheet vibes */}
          <div className="flex gap-3 pt-5 border-t border-slate-100 bg-white sticky bottom-0 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm font-semibold border border-slate-200 text-slate-600 py-3 rounded-xl hover:bg-slate-50 active:scale-98 transition duration-150 cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 text-sm font-bold bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 active:scale-98 transition duration-150 flex items-center justify-center gap-2 shadow-sm shadow-blue-500/15 cursor-pointer"
            >
              {isEditMode ? <Save className="w-4.5 h-4.5 animate-pulse" /> : <Plus className="w-4.5 h-4.5" />}
              <span>{isEditMode ? '수정된 사항 저장하기' : '소유자 데이터 추가등록'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
