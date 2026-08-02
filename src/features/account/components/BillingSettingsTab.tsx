"use client";

import { useState } from "react";
import { CreditCard, Plus, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
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
      status: "paid",
      statusText: "Pago",
    },
    {
      id: "INV-2026-002",
      title: "Plano Pro Scale (Mensal)",
      date: "02 de Julho, 2026",
      amount: "R$ 197,00",
      status: "paid",
      statusText: "Pago",
    },
    {
      id: "INV-2026-001",
      title: "Plano Iniciante (Teste)",
      date: "02 de Junho, 2026",
      amount: "R$ 97,00",
      status: "paid",
      statusText: "Pago",
    },
  ];

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Payment Method Card */}
      <div className="rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-10 shadow-[4px_4px_0px_#191A23] space-y-6">
        <div>
          <h2 className="text-2xl font-black text-[#191A23]">Método de Pagamento</h2>
          <p className="text-xs font-medium text-[#191A23]/70 mt-1">
            Atualize os detalhes do seu cartão de crédito para renovações automáticas do seu plano.
          </p>
        </div>

        {savedNotice && (
          <div className="rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] p-4 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#191A23]" />
            <span>Dados de pagamento atualizados com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSaveCard} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-2">
              <label className="text-xs font-bold uppercase text-[#191A23]">Nome impresso no Cartão</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#191A23] bg-white px-4 py-3 text-sm font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] focus:outline-none focus:bg-[#B9FF66]/20"
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-bold uppercase text-[#191A23]">Validade (MM/AA)</label>
              <input
                type="text"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#191A23] bg-white px-4 py-3 text-sm font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] focus:outline-none focus:bg-[#B9FF66]/20"
              />
            </div>

            <div className="md:col-span-8 space-y-2">
              <label className="text-xs font-bold uppercase text-[#191A23]">Número do Cartão</label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full rounded-2xl border-2 border-[#191A23] bg-white pl-11 pr-4 py-3 text-sm font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] focus:outline-none focus:bg-[#B9FF66]/20 font-mono"
                />
                <CreditCard className="absolute left-4 top-3.5 h-5 w-5 text-[#191A23]" />
              </div>
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-bold uppercase text-[#191A23]">CVV / CVC</label>
              <input
                type="password"
                maxLength={4}
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#191A23] bg-white px-4 py-3 text-sm font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] focus:outline-none focus:bg-[#B9FF66]/20 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              type="submit"
              className="h-11 rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] text-[#191A23] font-black text-sm shadow-[3px_3px_0px_#191A23] hover:bg-[#B9FF66]/90 cursor-pointer"
            >
              Salvar Cartão de Crédito
            </Button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#191A23] bg-white px-4 py-2.5 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23]"
            >
              <Plus className="h-4 w-4" />
              Adicionar outro cartão
            </button>
          </div>
        </form>
      </div>

      {/* Invoice Contact Email Card */}
      <div className="rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-10 shadow-[4px_4px_0px_#191A23] space-y-4">
        <div>
          <h2 className="text-xl font-black text-[#191A23]">E-mail para Recibos e Faturas</h2>
          <p className="text-xs font-medium text-[#191A23]/70 mt-1">
            Para onde devemos enviar os comprovantes fiscais das suas assinaturas?
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="contactEmailOption"
              checked={contactEmailOption === "existing"}
              onChange={() => setContactEmailOption("existing")}
              className="h-5 w-5 accent-[#191A23]"
            />
            <span className="text-sm font-bold text-[#191A23]">
              Enviar para o e-mail principal da conta
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="contactEmailOption"
              checked={contactEmailOption === "custom"}
              onChange={() => setContactEmailOption("custom")}
              className="h-5 w-5 accent-[#191A23]"
            />
            <span className="text-sm font-bold text-[#191A23]">
              Cadastrar outro e-mail de faturamento / financeiro
            </span>
          </label>

          {contactEmailOption === "custom" && (
            <div className="pt-2 pl-8">
              <input
                type="email"
                placeholder="financeiro@empresa.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full max-w-md rounded-2xl border-2 border-[#191A23] bg-white px-4 py-3 text-sm font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Billing History Table Card (Matching Screenshot 1) */}
      <div className="rounded-[35px] border-2 border-[#191A23] bg-white p-6 sm:p-10 shadow-[4px_4px_0px_#191A23] space-y-6">
        <div>
          <h2 className="text-2xl font-black text-[#191A23]">Histórico de Cobranças</h2>
          <p className="text-xs font-medium text-[#191A23]/70 mt-1">
            Veja todas as faturas e recibos das transações realizadas na sua conta.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border-2 border-[#191A23]">
          <table className="w-full text-left text-sm text-[#191A23]">
            <thead className="bg-[#F3F3F3] text-xs font-black uppercase text-[#191A23] border-b-2 border-[#191A23]">
              <tr>
                <th className="px-6 py-4">Fatura</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#191A23]/20 font-medium">
              {billingHistory.map((item) => (
                <tr key={item.id} className="hover:bg-[#F3F3F3]/50">
                  <td className="px-6 py-4">
                    <span className="font-black text-[#191A23] block">{item.title}</span>
                    <span className="text-xs text-[#191A23]/60 font-mono">{item.id}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-[#191A23]/80">{item.date}</td>
                  <td className="px-6 py-4 font-black font-mono">{item.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#191A23] bg-[#B9FF66] px-3 py-1 text-xs font-black text-[#191A23] shadow-[1px_1px_0px_#191A23]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {item.statusText}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1.5 rounded-xl border border-[#191A23] bg-white px-3 py-1.5 text-xs font-bold text-[#191A23] shadow-[2px_2px_0px_#191A23] hover:bg-[#B9FF66]">
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
