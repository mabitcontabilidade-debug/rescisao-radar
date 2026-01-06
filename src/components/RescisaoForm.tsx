import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { rescisaoConfig } from '@/lib/rescisao-config';
import { DadosRescisao } from '@/lib/rescisao-calculator';

interface RescisaoFormProps {
  onCalculate: (dados: DadosRescisao) => void;
}

export function RescisaoForm({ onCalculate }: RescisaoFormProps) {
  // Dados básicos
  const [salarioBase, setSalarioBase] = useState<string>('');
  const [dataAdmissao, setDataAdmissao] = useState<Date>();
  const [dataDesligamento, setDataDesligamento] = useState<Date>();
  const [motivoCodigo, setMotivoCodigo] = useState<string>('');
  const [tipoContrato, setTipoContrato] = useState<string>('INDETERMINADO');
  const [tipoAviso, setTipoAviso] = useState<string>('INDENIZADO');
  const [diasTrabalhados, setDiasTrabalhados] = useState<string>('');
  const [periodosFeriasVencidas, setPeriodosFeriasVencidas] = useState<string>('0');
  const [saldoFgts, setSaldoFgts] = useState<string>('');
  const [dependentesIrrf, setDependentesIrrf] = useState<string>('0');
  const [mediaVariaveis, setMediaVariaveis] = useState<string>('0');
  const [descontoAvisoDias, setDescontoAvisoDias] = useState<string>('0');
  
  // Faltas fracionadas
  const [faltasDias, setFaltasDias] = useState<string>('0');
  const [dsrFaltas, setDsrFaltas] = useState<string>('0');
  
  // Avos editáveis
  const [avosFeriasEditado, setAvosFeriasEditado] = useState<string>('');
  const [avosFeriasJustificativa, setAvosFeriasJustificativa] = useState<string>('');
  const [avos13Editado, setAvos13Editado] = useState<string>('');
  const [avos13Justificativa, setAvos13Justificativa] = useState<string>('');
  
  // Adicionais (seção colapsável)
  const [adicionaisOpen, setAdicionaisOpen] = useState(false);
  const [horasNoturnas, setHorasNoturnas] = useState<string>('');
  const [valorHoraNoturna, setValorHoraNoturna] = useState<string>('');
  const [periculosidade, setPericulosidade] = useState<string>('');
  const [insalubridadeGrau, setInsalubridadeGrau] = useState<string>('');
  const [insalubridadeBase, setInsalubridadeBase] = useState<string>('');
  const [quebraCaixa, setQuebraCaixa] = useState<string>('');
  const [vrValorDia, setVrValorDia] = useState<string>('');
  const [vrDiasUteis, setVrDiasUteis] = useState<string>('');
  const [atsPercentual, setAtsPercentual] = useState<string>('');
  const [atsAnos, setAtsAnos] = useState<string>('');
  const [comissao, setComissao] = useState<string>('');
  const [horaExtraValor, setHoraExtraValor] = useState<string>('');
  const [horaExtraPercentual, setHoraExtraPercentual] = useState<string>('50');
  const [dsrVariaveis, setDsrVariaveis] = useState<string>('');

  const selectedMotivo = rescisaoConfig.motivos.find(m => m.codigo === motivoCodigo);
  const showAvisoOptions = selectedMotivo && 
    ['SEM_JUSTA_CAUSA_EQUIVALENTE', 'ACORDO_484A'].includes(selectedMotivo.categoriaBase);
  const showDescontoAviso = selectedMotivo?.categoriaBase === 'PEDIDO_DEMISSAO';

  // Cálculo automático dos avos
  const avosCalculados = useMemo(() => {
    if (!dataAdmissao || !dataDesligamento) return { ferias: 0, decimoTerceiro: 0 };
    
    const calcularDiferencaMeses = (inicio: Date, fim: Date): number => {
      const anos = fim.getFullYear() - inicio.getFullYear();
      const meses = fim.getMonth() - inicio.getMonth();
      const dias = fim.getDate() - inicio.getDate();
      let totalMeses = anos * 12 + meses;
      if (dias >= 15) totalMeses++;
      return Math.max(0, totalMeses);
    };
    
    const mesesVinculo = calcularDiferencaMeses(dataAdmissao, dataDesligamento);
    const mesesFerias = mesesVinculo % 12;
    const meses13 = dataDesligamento.getMonth() + 1;
    
    return { ferias: mesesFerias, decimoTerceiro: meses13 };
  }, [dataAdmissao, dataDesligamento]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const number = parseInt(numericValue, 10) / 100;
    if (isNaN(number)) return '';
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleSalarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setSalarioBase(formatted);
  };

  const handleSaldoFgtsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setSaldoFgts(formatted);
  };

  const handleMediaVariaveisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setMediaVariaveis(formatted);
  };

  const handleCurrencyChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setter(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataAdmissao || !dataDesligamento || !motivoCodigo) {
      return;
    }

    const dados: DadosRescisao = {
      salarioBase: parseCurrency(salarioBase),
      dataAdmissao,
      dataDesligamento,
      motivoCodigo,
      tipoContrato,
      tipoAviso,
      diasTrabalhados: parseInt(diasTrabalhados) || 30,
      mesesFeriasVencidas: 0,
      periodosFeriasVencidas: parseInt(periodosFeriasVencidas) || 0,
      saldoFgts: parseCurrency(saldoFgts),
      dependentesIrrf: parseInt(dependentesIrrf) || 0,
      mediaVariaveis: parseCurrency(mediaVariaveis),
      descontoAvisoDias: parseInt(descontoAvisoDias) || 0,
      faltasDias: parseFloat(faltasDias.replace(',', '.')) || 0,
      dsrFaltas: parseCurrency(dsrFaltas),
      avosFerias: {
        calculado: avosCalculados.ferias,
        editado: avosFeriasEditado ? parseInt(avosFeriasEditado) : undefined,
        justificativa: avosFeriasJustificativa || undefined,
      },
      avos13: {
        calculado: avosCalculados.decimoTerceiro,
        editado: avos13Editado ? parseInt(avos13Editado) : undefined,
        justificativa: avos13Justificativa || undefined,
      },
      adicionais: {
        adicionalNoturno: horasNoturnas && valorHoraNoturna ? {
          horasNoturnas: parseFloat(horasNoturnas.replace(',', '.')) || 0,
          valorHora: parseCurrency(valorHoraNoturna),
        } : undefined,
        periculosidade: periculosidade ? parseFloat(periculosidade.replace(',', '.')) / 100 : undefined,
        insalubridade: insalubridadeGrau && insalubridadeBase ? {
          grau: insalubridadeGrau as 'minimo' | 'medio' | 'maximo',
          base: parseCurrency(insalubridadeBase),
        } : undefined,
        quebraCaixa: parseCurrency(quebraCaixa) || undefined,
        valeRefeicao: vrValorDia && vrDiasUteis ? {
          valorDia: parseCurrency(vrValorDia),
          diasUteis: parseInt(vrDiasUteis) || 0,
        } : undefined,
        ats: atsPercentual && atsAnos ? {
          percentual: parseFloat(atsPercentual.replace(',', '.')) / 100 || 0,
          anosAplicaveis: parseInt(atsAnos) || 0,
        } : undefined,
        comissao: parseCurrency(comissao) || undefined,
        horaExtra: horaExtraValor ? {
          valor: parseCurrency(horaExtraValor),
          percentualAdicional: parseFloat(horaExtraPercentual) / 100 || 0.5,
        } : undefined,
        dsrSobreVariaveis: parseCurrency(dsrVariaveis) || undefined,
      },
    };

    onCalculate(dados);
  };

  const showFaltasDsrWarning = parseFloat(faltasDias.replace(',', '.')) > 0 && parseCurrency(dsrFaltas) === 0;

  return (
    <Card className="card-elevated">
      <CardHeader className="header-gradient text-primary-foreground rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5" />
          Dados da Rescisão
        </CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Preencha as informações do funcionário
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Motivo da Rescisão */}
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium">
              Motivo da Rescisão *
            </Label>
            <Select value={motivoCodigo} onValueChange={setMotivoCodigo}>
              <SelectTrigger id="motivo" className="w-full">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {rescisaoConfig.motivos.map((motivo) => (
                  <SelectItem key={motivo.codigo} value={motivo.codigo}>
                    <span className="font-mono text-muted-foreground mr-2">{motivo.codigo}</span>
                    {motivo.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Admissão *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataAdmissao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataAdmissao ? format(dataAdmissao, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataAdmissao}
                    onSelect={setDataAdmissao}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de Desligamento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataDesligamento && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataDesligamento ? format(dataDesligamento, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataDesligamento}
                    onSelect={setDataDesligamento}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tipo de Contrato e Aviso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={tipoContrato} onValueChange={setTipoContrato}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rescisaoConfig.tiposContrato.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showAvisoOptions && (
              <div className="space-y-2">
                <Label>Tipo de Aviso Prévio</Label>
                <Select value={tipoAviso} onValueChange={setTipoAviso}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rescisaoConfig.tiposAviso.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salario" className="flex items-center gap-1">
                Salário Base *
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Salário mensal bruto do funcionário
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="salario"
                  value={salarioBase}
                  onChange={handleSalarioChange}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mediaVariaveis" className="flex items-center gap-1">
                Média de Variáveis
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Média de comissões, horas extras, adicionais, etc. (integra aviso e reflexos)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="mediaVariaveis"
                  value={mediaVariaveis}
                  onChange={handleMediaVariaveisChange}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          {/* Dias e Períodos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diasTrabalhados">Dias Trabalhados no Mês</Label>
              <Input
                id="diasTrabalhados"
                type="number"
                min="0"
                max="31"
                value={diasTrabalhados}
                onChange={(e) => setDiasTrabalhados(e.target.value)}
                className="font-mono"
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodosFeriasVencidas">Períodos Férias Vencidas</Label>
              <Input
                id="periodosFeriasVencidas"
                type="number"
                min="0"
                max="3"
                value={periodosFeriasVencidas}
                onChange={(e) => setPeriodosFeriasVencidas(e.target.value)}
                className="font-mono"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dependentes">Dependentes IRRF</Label>
              <Input
                id="dependentes"
                type="number"
                min="0"
                value={dependentesIrrf}
                onChange={(e) => setDependentesIrrf(e.target.value)}
                className="font-mono"
                placeholder="0"
              />
            </div>
          </div>

          {/* Faltas fracionadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="faltasDias" className="flex items-center gap-1">
                Faltas (dias)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Aceita valores decimais (ex: 0,5 para meio período)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="faltasDias"
                type="text"
                inputMode="decimal"
                value={faltasDias}
                onChange={(e) => setFaltasDias(e.target.value)}
                className="font-mono"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dsrFaltas" className="flex items-center gap-1">
                DSR sobre Faltas
                {showFaltasDsrWarning && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Há faltas informadas sem DSR correspondente. Verifique se o desconto de DSR é aplicável.
                    </TooltipContent>
                  </Tooltip>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="dsrFaltas"
                  value={dsrFaltas}
                  onChange={handleCurrencyChange(setDsrFaltas)}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          {/* Avos editáveis */}
          {dataAdmissao && dataDesligamento && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Avos (1/12) - Férias e 13º
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Férias calculado:</span>
                    <span className="font-mono font-medium">{avosCalculados.ferias}/12</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avosFeriasEditado" className="text-sm">Férias editado (opcional)</Label>
                    <Input
                      id="avosFeriasEditado"
                      type="number"
                      min="0"
                      max="12"
                      value={avosFeriasEditado}
                      onChange={(e) => setAvosFeriasEditado(e.target.value)}
                      className="font-mono"
                      placeholder={avosCalculados.ferias.toString()}
                    />
                  </div>
                  {avosFeriasEditado && avosFeriasEditado !== avosCalculados.ferias.toString() && (
                    <div className="space-y-2">
                      <Label htmlFor="avosFeriasJustificativa" className="text-sm text-amber-600">
                        Justificativa (obrigatória) *
                      </Label>
                      <Textarea
                        id="avosFeriasJustificativa"
                        value={avosFeriasJustificativa}
                        onChange={(e) => setAvosFeriasJustificativa(e.target.value)}
                        placeholder="Informe o motivo da alteração..."
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">13º calculado:</span>
                    <span className="font-mono font-medium">{avosCalculados.decimoTerceiro}/12</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avos13Editado" className="text-sm">13º editado (opcional)</Label>
                    <Input
                      id="avos13Editado"
                      type="number"
                      min="0"
                      max="12"
                      value={avos13Editado}
                      onChange={(e) => setAvos13Editado(e.target.value)}
                      className="font-mono"
                      placeholder={avosCalculados.decimoTerceiro.toString()}
                    />
                  </div>
                  {avos13Editado && avos13Editado !== avosCalculados.decimoTerceiro.toString() && (
                    <div className="space-y-2">
                      <Label htmlFor="avos13Justificativa" className="text-sm text-amber-600">
                        Justificativa (obrigatória) *
                      </Label>
                      <Textarea
                        id="avos13Justificativa"
                        value={avos13Justificativa}
                        onChange={(e) => setAvos13Justificativa(e.target.value)}
                        placeholder="Informe o motivo da alteração..."
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FGTS e Aviso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saldoFgts" className="flex items-center gap-1">
                Saldo FGTS (para cálculo da multa)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Saldo total do FGTS para base da multa de 40% ou 20%
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="saldoFgts"
                  value={saldoFgts}
                  onChange={handleSaldoFgtsChange}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            {showDescontoAviso && (
              <div className="space-y-2">
                <Label htmlFor="descontoAvisoDias">Dias de Aviso Não Cumprido</Label>
                <Input
                  id="descontoAvisoDias"
                  type="number"
                  min="0"
                  max="30"
                  value={descontoAvisoDias}
                  onChange={(e) => setDescontoAvisoDias(e.target.value)}
                  className="font-mono"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {/* Adicionais (colapsável) */}
          <Collapsible open={adicionaisOpen} onOpenChange={setAdicionaisOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" type="button" className="w-full justify-between">
                <span>Adicionais e Variáveis do Mês</span>
                {adicionaisOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Adicional Noturno */}
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-medium">Adicional Noturno (hora reduzida 52:30)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Horas Noturnas</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={horasNoturnas}
                      onChange={(e) => setHorasNoturnas(e.target.value)}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Valor Hora</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        value={valorHoraNoturna}
                        onChange={handleCurrencyChange(setValorHoraNoturna)}
                        className="pl-8 font-mono"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Periculosidade */}
              <div className="space-y-2">
                <Label className="text-sm">Periculosidade (%)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={periculosidade}
                  onChange={(e) => setPericulosidade(e.target.value)}
                  className="font-mono"
                  placeholder="30"
                />
              </div>

              {/* Insalubridade */}
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-medium">Insalubridade</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Grau</Label>
                    <Select value={insalubridadeGrau} onValueChange={setInsalubridadeGrau}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimo">Mínimo (10%)</SelectItem>
                        <SelectItem value="medio">Médio (20%)</SelectItem>
                        <SelectItem value="maximo">Máximo (40%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Base de Cálculo</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        value={insalubridadeBase}
                        onChange={handleCurrencyChange(setInsalubridadeBase)}
                        className="pl-8 font-mono"
                        placeholder="Sal. mínimo"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quebra de Caixa */}
              <div className="space-y-2">
                <Label className="text-sm">Quebra de Caixa</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    value={quebraCaixa}
                    onChange={handleCurrencyChange(setQuebraCaixa)}
                    className="pl-10 font-mono"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Vale Refeição */}
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-medium">Vale Refeição</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Valor por Dia</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        value={vrValorDia}
                        onChange={handleCurrencyChange(setVrValorDia)}
                        className="pl-8 font-mono"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Dias Úteis</Label>
                    <Input
                      type="number"
                      min="0"
                      max="31"
                      value={vrDiasUteis}
                      onChange={(e) => setVrDiasUteis(e.target.value)}
                      className="font-mono"
                      placeholder="22"
                    />
                  </div>
                </div>
              </div>

              {/* ATS */}
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-medium">ATS (Adicional por Tempo de Serviço)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Percentual por Ano (%)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={atsPercentual}
                      onChange={(e) => setAtsPercentual(e.target.value)}
                      className="font-mono"
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Anos Aplicáveis</Label>
                    <Input
                      type="number"
                      min="0"
                      value={atsAnos}
                      onChange={(e) => setAtsAnos(e.target.value)}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Comissão e Hora Extra com DSR único */}
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-medium">Comissão, Hora Extra e DSR</h5>
                <p className="text-xs text-muted-foreground">
                  O DSR será calculado sobre a soma de Comissão + Hora Extra (base única)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Comissão</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        value={comissao}
                        onChange={handleCurrencyChange(setComissao)}
                        className="pl-8 font-mono"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Hora Extra (valor total)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        value={horaExtraValor}
                        onChange={handleCurrencyChange(setHoraExtraValor)}
                        className="pl-8 font-mono"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Adicional HE (%)</Label>
                    <Select value={horaExtraPercentual} onValueChange={setHoraExtraPercentual}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">DSR sobre Variáveis</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        value={dsrVariaveis}
                        onChange={handleCurrencyChange(setDsrVariaveis)}
                        className="pl-8 font-mono"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-accent hover:bg-accent/90"
            disabled={!salarioBase || !dataAdmissao || !dataDesligamento || !motivoCodigo}
          >
            <Calculator className="mr-2 h-5 w-5" />
            Calcular Rescisão
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
