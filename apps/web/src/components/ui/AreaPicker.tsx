'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, ChevronRight, Search, X, ArrowLeft, Loader2, Plus, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface AreaPickerProps {
  value: string[]; // Sekarang menerima array
  onChange: (value: string[]) => void;
  label?: string;
}

interface Item {
  id: string;
  name: string;
}

export function AreaPicker({ value = [], onChange, label }: AreaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'province' | 'city'>('province');
  const [provinces, setProvinces] = useState<Item[]>([]);
  const [cities, setCities] = useState<Item[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen && provinces.length === 0) {
      fetchProvinces();
    }
  }, [isOpen]);

  const fetchProvinces = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
      const data = await res.json();
      setProvinces(data);
    } catch (err) {
      console.error('Failed to fetch provinces', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async (provinceId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`);
      const data = await res.json();
      setCities(data);
      setStep('city');
    } catch (err) {
      console.error('Failed to fetch cities', err);
    } finally {
      setLoading(false);
    }
  };

  const cleanName = (name: string) => {
    return name.replace(/KOTA /g, '').replace(/KABUPATEN /g, '').trim();
  };

  const handleToggleArea = (area: string) => {
    if (value.includes(area)) {
      onChange(value.filter(v => v !== area));
    } else {
      onChange([...value, area]);
    }
  };

  const filteredItems = (step === 'province' ? provinces : cities).filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      {label && (
        <label className="text-sm font-medium text-text-secondary mb-2 block">
          {label}
        </label>
      )}

      {/* Selected Areas Display */}
      <div className="flex flex-wrap gap-2 mb-3">
        {value.length > 0 ? value.map((area) => (
          <div key={area} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold animate-in zoom-in duration-200">
            <MapPin className="w-3 h-3" />
            {area}
            <button onClick={() => handleToggleArea(area)} className="hover:text-red-400 transition-colors ml-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        )) : (
          <p className="text-[11px] text-text-primary/30 italic">Belum ada wilayah terpilih (Semua Area)</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2 text-xs"
      >
        <Plus className="w-4 h-4" />
        Tambah Wilayah
      </button>

      {/* Modal / Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-ui-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-ui-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                {step === 'city' && (
                  <button 
                    onClick={() => { setStep('province'); setSearch(''); }}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-text-primary" />
                  </button>
                )}
                <div>
                  <h3 className="font-bold text-text-primary text-sm">
                    {step === 'province' ? 'Pilih Provinsi' : `Kota di ${cleanName(selectedProvince?.name || '')}`}
                  </h3>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-text-primary" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30 group-focus-within:text-primary transition-colors" />
                <input 
                  autoFocus
                  placeholder={step === 'province' ? "Cari Provinsi..." : "Cari Kota/Kabupaten..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs text-text-primary placeholder:text-text-primary/20 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-text-secondary">Mengambil data...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {filteredItems.map((item) => {
                    const itemName = cleanName(item.name);
                    const fullAreaName = step === 'province' ? itemName : `${cleanName(selectedProvince?.name || '')} - ${itemName}`;
                    const isSelected = value.includes(fullAreaName);

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (step === 'province') {
                            setSelectedProvince(item);
                            fetchCities(item.id);
                            setSearch('');
                          } else {
                            handleToggleArea(fullAreaName);
                          }
                        }}
                        className={clsx(
                          "flex items-center justify-between p-3 rounded-xl transition-all group text-left",
                          isSelected ? "bg-primary/20 border border-primary/30" : "hover:bg-primary/10"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className={clsx("text-sm transition-colors", isSelected ? "text-primary font-bold" : "text-text-primary group-hover:text-primary")}>
                            {itemName}
                          </span>
                          {step === 'city' && isSelected && <span className="text-[10px] text-primary/60 uppercase">Terpilih</span>}
                        </div>
                        {step === 'province' ? (
                          <div className="flex items-center gap-2">
                            {value.some(v => v.startsWith(itemName)) && <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Terisi</span>}
                            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-1" />
                          </div>
                        ) : (
                          <div className={clsx("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary" : "border-ui-border")}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                  
                  {/* Option to select Entire Province */}
                  {step === 'city' && !search && (
                    <div className="mt-4 pt-4 border-t border-ui-border">
                      <button
                        onClick={() => {
                          const provName = cleanName(selectedProvince?.name || '');
                          handleToggleArea(provName);
                        }}
                        className={clsx(
                          "w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed transition-all",
                          value.includes(cleanName(selectedProvince?.name || ''))
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-ui-border text-text-primary/40 hover:border-primary/30 hover:text-primary/60"
                        )}
                      >
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Pilih Seluruh Provinsi {cleanName(selectedProvince?.name || '')}</span>
                        {value.includes(cleanName(selectedProvince?.name || '')) && <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-muted/10 border-t border-ui-border flex justify-between items-center">
              <p className="text-[10px] text-text-secondary">{value.length} wilayah dipilih</p>
              <button onClick={() => setIsOpen(false)} className="btn-primary py-1.5 px-6 text-xs rounded-xl">Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
