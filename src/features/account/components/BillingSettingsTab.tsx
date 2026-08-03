"use client";

import { useState } from "react";
import { CreditCard, Plus, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BillingSettingsTab() {
  const [cardName, setCardName] = useState("Akib Ahmad");
  const [cardExpiry, setCardExpiry] = useState("08 / 2028");
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 4242");
  const [cardCvv, setCardCvv] = useState("•••");
  const [contactEmailOption, setContactEmailOption] = useState("existing");
  const [customEmail, setCustomEmail] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  const billingHistory = [
    {
      id: "INV-2026-003",
      title: "Plano Pro Scale (Mensal)",
      date: "02 de Agosto, 2026",
      amount: "R$ 197,00",
      statusText: "Pago",
    },
    {
      id: "INV-2026-002",
      title: "Plano Pro Scale (Mensal)",
      date: "02 de Julho, 2026",
      amount: "R$ 197,00",
      statusText: "Pago",
    },
    {
      id: "INV-2026-001",
      title: "Plano Iniciante (Teste)",
      date: "02 de Junho, 2026",
      amount: "R$ 97,00",
      statusText: "Pago",
    },
  ];

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[#191A23]">Método de Pagamento</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Atualize os detalhes do seu cartão de crédito para renovações automáticas do seu plano.
          </p>
        </div>

        {savedNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Dados de pagamento atualizados com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSaveCard} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-8 space-y-1.5">
              <label className="text-xs font-semibold text-[#191A23]">Nome no Cartão</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-[#191A23] outline-none focus:border-[#B9FF66]"
              />
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-[#191A23]">Validade (MM/AA)</label>
              <input
                type="text"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-[#191A23] outline-none focus:border-[#B9FF66]"
              />
            </div>

            <div className="md:col-span-8 space-y-1.5">
              <label className="text-xs font-semibold text-[#191A23]">Número do Cartão</label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-xs font-medium text-[#191A23] outline-none focus:border-[#B9FF66] font-mono"
                />
                <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-[#191A23]">CVV / CVC</label>
              <input
                type="password"
                maxLength={4}
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-[#191A23] outline-none focus:border-[#B9FF66] font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="submit"
              className="h-10 rounded-xl bg-[#B9FF66] hover:bg-[#a6ee50] text-[#191A23] font-bold text-xs shadow-xs border border-black/5 cursor-pointer"
            >
              Salvar Cartão de Crédito
            </Button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar outro cartão
            </button>
          </div>
        </form>
      </div>

      {/* Invoice Contact Email Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#191A23]">E-mail para Faturas e Recibos</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Para onde devemos enviar os comprovantes das suas assinaturas?
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="contactEmailOption"
              checked={contactEmailOption === "existing"}
              onChange={() => setContactEmailOption("existing")}
              className="h-4 w-4 accent-[#191A23]"
            />
            <span className="text-xs font-medium text-[#191A23]">
              Enviar para o e-mail principal da conta
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name="contactEmailOption"
              checked={contactEmailOption === "custom"}
              onChange={() => setContactEmailOption("custom")}
              className="h-4 w-4 accent-[#191A23]"
            />
            <span className="text-xs font-medium text-[#191A23]">
              Cadastrar outro e-mail de faturamento / financeiro
            </span>
          </label>

          {contactEmailOption === "custom" && (
            <div className="pt-1 pl-6">
              <input
                type="email"
                placeholder="financeiro@empresa.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-[#191A23] outline-none focus:border-[#B9FF66]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Billing History Table Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#191A23]">Histórico de Cobranças</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Veja todas as faturas e recibos das transações realizadas na sua conta.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs font-medium text-[#191A23]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Fatura</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {billingHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-[#191A23] block">{item.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{item.id}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{item.date}</td>
                  <td className="px-5 py-3.5 font-bold font-mono">{item.amount}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B9FF66] border border-black/5 px-2.5 py-0.5 text-xs font-bold text-[#191A23]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {item.statusText}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
