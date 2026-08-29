import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Plus, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { CatalogItem, Company, ComponentCompany } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  catalog: CatalogItem[];
  companies: Company[];
  componentCompanies: ComponentCompany[];
}

type SortCol = 'price' | 'moq' | 'lead_time' | null;
type SortDir = 'asc' | 'desc';

export const ComponentComparisonPage: React.FC<Props> = ({ catalog, companies, componentCompanies }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [component, setComponent] = useState<CatalogItem | null>(null);
  const [linkedCompanies, setLinkedCompanies] = useState<(ComponentCompany & { company: Company })[]>([]);

  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    if (!id) return;
    const item = catalog.find(c => c.id === id);
    setComponent(item || null);

    const links = componentCompanies.filter(cc => cc.component_id === id).map(cc => {
      const comp = companies.find(c => c.id === cc.company_id);
      return { ...cc, company: comp! };
    }).filter(cc => cc.company);

    setLinkedCompanies(links);
  }, [id, catalog, componentCompanies, companies]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortCol(null); setSortDir('asc'); }
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const getSortedCompanies = () => {
    if (!sortCol) return linkedCompanies;
    return [...linkedCompanies].sort((a, b) => {
      let valA = 0; let valB = 0;
      if (sortCol === 'price') { valA = a.unit_price; valB = b.unit_price; }
      if (sortCol === 'moq') { valA = a.moq; valB = b.moq; }
      if (sortCol === 'lead_time') { valA = a.lead_time_days; valB = b.lead_time_days; }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  };

  const handleInlineSave = async (linkId: string, field: 'unit_price' | 'moq' | 'lead_time_days', value: number) => {
    // Optimistic UI update
    setLinkedCompanies(prev => prev.map(c => c.id === linkId ? { ...c, [field]: value } : c));
    
    // Patch to supabase
    try {
      await supabase.from('component_companies').update({ [field]: value }).eq('id', linkId);
    } catch (e) {
      console.error('Failed to update inline:', e);
    }
  };

  if (!component) return <div className="p-8">Component not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-200 rounded-full">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#0B192C]">{component.name}</h1>
          <p className="text-slate-500">SKU: {component.sku} | Category: {component.category}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800">Linked Companies Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1">RFQ Price {sortCol === 'price' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>)}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('moq')}>
                  <div className="flex items-center gap-1">MOQ {sortCol === 'moq' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>)}</div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('lead_time')}>
                  <div className="flex items-center gap-1">Lead Time {sortCol === 'lead_time' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>)}</div>
                </th>
                <th className="px-6 py-4">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {getSortedCompanies().map((link, idx) => (
                <tr key={link.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">{idx + 1}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{link.company.name}</td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                      defaultValue={link.rfq_quoted_price || link.unit_price}
                      onBlur={(e) => handleInlineSave(link.id, 'unit_price', parseFloat(e.target.value))}
                      onKeyDown={(e) => { if(e.key === 'Enter') e.currentTarget.blur(); }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                      defaultValue={link.moq}
                      onBlur={(e) => handleInlineSave(link.id, 'moq', parseInt(e.target.value))}
                      onKeyDown={(e) => { if(e.key === 'Enter') e.currentTarget.blur(); }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                      defaultValue={link.lead_time_days}
                      onBlur={(e) => handleInlineSave(link.id, 'lead_time_days', parseInt(e.target.value))}
                      onKeyDown={(e) => { if(e.key === 'Enter') e.currentTarget.blur(); }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    {link.company.remark ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                        {link.company.remark}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">No remarks</span>
                    )}
                  </td>
                </tr>
              ))}
              {linkedCompanies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No companies linked to this component yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
