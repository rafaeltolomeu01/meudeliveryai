import { Bot, MessageSquare, Sparkles, Save } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function AIAttendantPage() {
  const [enabled,setEnabled]=useState(()=>localStorage.getItem('mda_ai_enabled')==='true')
  const [prompt,setPrompt]=useState(()=>localStorage.getItem('mda_ai_prompt') || 'Você é um atendente educado do restaurante. Responda dúvidas sobre cardápio, horários, entrega e acompanhe pedidos. Quando não souber, chame um atendente humano.')
  const save=()=>{localStorage.setItem('mda_ai_enabled',String(enabled));localStorage.setItem('mda_ai_prompt',prompt);toast.success('Atendente IA salvo')}
  return <div className="mda-light-page space-y-6 max-w-5xl">
    <div><h2 className="text-2xl font-black flex items-center gap-2"><Bot className="text-[#ea1d2c]"/>Atendente IA</h2><p className="text-[#717171] text-sm">Estrutura para deixar a IA disponível para responder mensagens. Para responder no WhatsApp real, configure a API/IA na página WhatsApp.</p></div>
    <div className="mda-card bg-white rounded-2xl border p-6 space-y-5">
      <div className="flex items-center justify-between rounded-2xl bg-[#f7f7f7] p-4"><div><h3 className="font-black">IA disponível para mensagens</h3><p className="text-sm text-[#717171]">Quando ativo, o painel mostra a IA como atendente disponível.</p></div><button onClick={()=>setEnabled(!enabled)} className={`px-5 py-2 rounded-full font-black ${enabled?'bg-green-600 text-white':'bg-gray-200 text-gray-700'}`}>{enabled?'Ativo':'Inativo'}</button></div>
      <label className="block"><span className="font-black text-sm">Comportamento da IA</span><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={8} className="mt-2 w-full rounded-2xl border border-[#e8e8e8] p-4 outline-none focus:border-[#ea1d2c]"/></label>
      <div className="rounded-2xl border border-[#e8e8e8] p-4 bg-[#fff7f7]"><p className="font-black flex items-center gap-2"><Sparkles size={18}/>Próximo passo</p><p className="text-sm text-[#717171] mt-1">A integração real usa sua Evolution API + OpenAI. Esta tela deixa a configuração pronta no painel; a página WhatsApp continua sendo o local de conexão.</p></div>
      <button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#ea1d2c] text-white px-5 py-3 font-black"><Save size={18}/>Salvar</button>
    </div>
  </div>
}
