import { useState, useMemo, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Info, AlertTriangle, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { rescisaoConfig } from '@/lib/rescisao-config';
import { DadosRescisao } from '@/lib/rescisao-calculator';

interface RescisaoFormProps {
  onCalculate: (dados: DadosRescisao) => void;
}

export function RescisaoForm({ onCalculate }: RescisaoFormProps) {
  // Dados básicos
  const [salarioBase, setSalarioBase] = useState<string>('');
  const [dataAdmissao, setDataAdmissao] = useState<Date>();
  const [dataAdmissaoText, setDataAdmissaoText] = useState<string>('');
  const [dataDesligamento, setDataDesligamento] = useState<Date>();
  const [dataDesligamentoText, setDataDesligamentoText] = useState<string>('');
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
  
  // Dias de aviso editável
  const [diasAvisoEditado, setDiasAvisoEditado] = useState<string>('');
  const [diasAvisoJustificativa, setDiasAvisoJustificativa] = useState<string>('');
  
  // Adicionais (seção colapsável)
  const [adicionaisOpen, setAdicionaisOpen] = useState(false);
  const [horasNoturnas, setHorasNoturnas] = useState<string>('');
  const [percentualNoturno, setPercentualNoturno] = useState<string>('20');
  const [periculosidade, setPericulosidade] = useState<string>('');
  const [insalubridadeGrau, setInsalubridadeGrau] = useState<string>('');
  const [insalubridadeBase, setInsalubridadeBase] = useState<string>('');
  const [quebraCaixaPercentual, setQuebraCaixaPercentual] = useState<string>('');
  const [vrValorDia, setVrValorDia] = useState<string>('');
  const [vrDiasUteis, setVrDiasUteis] = useState<string>('');
  const [atsPercentual, setAtsPercentual] = useState<string>('');
  const [atsAnos, setAtsAnos] = useState<string>('');
  const [comissao, setComissao] = useState<string>('');
  const [gratificacao, setGratificacao] = useState<string>('');
  const [horasContratoMensal, setHorasContratoMensal] = useState<string>('220');
  const [quantidadeHe50, setQuantidadeHe50] = useState<string>('');
  const [quantidadeHe100, setQuantidadeHe100] = useState<string>('');
  
  // Intrajornada e Interjornada
  const [intrajornadaHoras, setIntrajornadaHoras] = useState<string>('');
  const [intrajornadaFator, setIntrajornadaFator] = useState<string>('1.5');
  const [interjornadaHoras, setInterjornadaHoras] = useState<string>('');
  const [interjornadaFator, setInterjornadaFator] = useState<string>('1.5');
  
  // DSR Configurável
  const [dsrDialogOpen, setDsrDialogOpen] = useState(false);
  const [dsrDiasUteis, setDsrDiasUteis] = useState<string>('22');
  const [dsrDiasNaoUteis, setDsrDiasNaoUteis] = useState<string>('5');

  const selectedMotivo = rescisaoConfig.motivos.find(m => m.codigo === motivoCodigo);
  const showAvisoOptions = selectedMotivo && 
    ['SEM_JUSTA_CAUSA_EQUIVALENTE', 'ACORDO_484A'].includes(selectedMotivo.categoriaBase);
  const showDescontoAviso = selectedMotivo?.categoriaBase === 'PEDIDO_DEMISSAO';

  // Auto-preencher dias trabalhados quando data de desligamento mudar
  useEffect(() => {
    if (dataDesligamento) {
      setDiasTrabalhados(dataDesligamento.getDate().toString());
    }
  }, [dataDesligamento]);

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

  // Cálculo automático dos dias de aviso
  const diasAvisoCalculado = useMemo(() => {
    if (!dataAdmissao || !dataDesligamento) return 30;
    const diasVinculo = Math.floor((dataDesligamento.getTime() - dataAdmissao.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const anosCompletos = Math.floor(diasVinculo / 365);
    return Math.min(30 + Math.max(0, anosCompletos - 1) * 3, 90);
  }, [dataAdmissao, dataDesligamento]);

  // Cálculo automático da quebra de caixa
  const quebraCaixaValor = useMemo(() => {
    const salario = parseCurrency(salarioBase);
    const percentual = parseFloat(quebraCaixaPercentual) / 100 || 0;
    return salario * percentual;
  }, [salarioBase, quebraCaixaPercentual]);

  // Cálculo automático do valor hora para adicional noturno, intrajornada, interjornada
  const valorHoraCalculado = useMemo(() => {
    const salario = parseCurrency(salarioBase);
    const valorATS = atsPercentual && atsAnos 
      ? salario * (parseFloat(atsPercentual.replace(',', '.')) / 100 || 0) * (parseInt(atsAnos) || 0)
      : 0;
    const valorComissao = parseCurrency(comissao);
    const valorInsalubridade = insalubridadeGrau && insalubridadeBase
      ? parseCurrency(insalubridadeBase) * ({ minimo: 0.10, medio: 0.20, maximo: 0.40 }[insalubridadeGrau as 'minimo' | 'medio' | 'maximo'] || 0)
      : 0;
    const valorGratificacao = parseCurrency(gratificacao);
    const valorPericulosidade = periculosidade 
      ? salario * (parseFloat(periculosidade.replace(',', '.')) / 100 || 0)
      : 0;
    
    const baseHE = salario + valorATS + valorComissao + valorInsalubridade + valorGratificacao + valorPericulosidade;
    const divisor = parseInt(horasContratoMensal) || 220;
    
    return baseHE / divisor;
  }, [salarioBase, atsPercentual, atsAnos, comissao, insalubridadeGrau, insalubridadeBase, gratificacao, periculosidade, horasContratoMensal]);

  // Cálculos automáticos de valores
  const adicionalNoturnoValor = useMemo(() => {
    const horas = parseFloat(horasNoturnas.replace(',', '.')) || 0;
    const percentual = parseFloat(percentualNoturno) / 100 || 0.20;
    const fatorHoraReduzida = 60 / 52.5;
    return horas * valorHoraCalculado * fatorHoraReduzida * percentual;
  }, [horasNoturnas, percentualNoturno, valorHoraCalculado]);

  const intrajornadaValor = useMemo(() => {
    const horas = parseFloat(intrajornadaHoras.replace(',', '.')) || 0;
    const fator = parseFloat(intrajornadaFator) || 1.5;
    return horas * valorHoraCalculado * fator;
  }, [intrajornadaHoras, intrajornadaFator, valorHoraCalculado]);

  const interjornadaValor = useMemo(() => {
    const horas = parseFloat(interjornadaHoras.replace(',', '.')) || 0;
    const fator = parseFloat(interjornadaFator) || 1.5;
    return horas * valorHoraCalculado * fator;
  }, [interjornadaHoras, interjornadaFator, valorHoraCalculado]);

  // Cálculo do DSR sobre variáveis
  const dsrVariaveisValor = useMemo(() => {
    const diasUteis = parseInt(dsrDiasUteis) || 0;
    const diasNaoUteis = parseInt(dsrDiasNaoUteis) || 0;
    
    if (diasUteis === 0) return 0;
    
    // Soma das variáveis: comissão + HE + intrajornada + interjornada + adicional noturno
    const he50 = valorHoraCalculado * 1.5 * (parseFloat(quantidadeHe50.replace(',', '.')) || 0);
    const he100 = valorHoraCalculado * 2.0 * (parseFloat(quantidadeHe100.replace(',', '.')) || 0);
    const heValor = he50 + he100;
    
    const totalVariaveis = parseCurrency(comissao) + heValor + intrajornadaValor + interjornadaValor + adicionalNoturnoValor;
    
    return (totalVariaveis / diasUteis) * diasNaoUteis;
  }, [comissao, quantidadeHe50, quantidadeHe100, valorHoraCalculado, intrajornadaValor, interjornadaValor, adicionalNoturnoValor, dsrDiasUteis, dsrDiasNaoUteis]);

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

  // Funções para input de data híbrido
  const handleDateTextChange = (
    text: string, 
    setDateText: (value: string) => void, 
    setDate: (date: Date | undefined) => void
  ) => {
    // Aplicar máscara dd/mm/aaaa
    let masked = text.replace(/\D/g, '');
    if (masked.length > 2) masked = masked.slice(0, 2) + '/' + masked.slice(2);
    if (masked.length > 5) masked = masked.slice(0, 5) + '/' + masked.slice(5);
    if (masked.length > 10) masked = masked.slice(0, 10);
    
    setDateText(masked);
    
    // Tentar parsear a data
    if (masked.length === 10) {
      const parsed = parse(masked, 'dd/MM/yyyy', new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
        setDate(parsed);
      } else {
        setDate(undefined);
      }
    }
  };

  const handleCalendarSelect = (
    date: Date | undefined,
    setDate: (date: Date | undefined) => void,
    setDateText: (text: string) => void
  ) => {
    setDate(date);
    if (date) {
      setDateText(format(date, 'dd/MM/yyyy'));
    } else {
      setDateText('');
    }
  };

  // Função para limpar todos os dados
  const handleLimparDados = () => {
    setSalarioBase('');
    setDataAdmissao(undefined);
    setDataAdmissaoText('');
    setDataDesligamento(undefined);
    setDataDesligamentoText('');
    setMotivoCodigo('');
    setTipoContrato('INDETERMINADO');
    setTipoAviso('INDENIZADO');
    setDiasTrabalhados('');
    setPeriodosFeriasVencidas('0');
    setSaldoFgts('');
    setDependentesIrrf('0');
    setMediaVariaveis('0');
    setDescontoAvisoDias('0');
    setFaltasDias('0');
    setDsrFaltas('0');
    setAvosFeriasEditado('');
    setAvosFeriasJustificativa('');
    setAvos13Editado('');
    setAvos13Justificativa('');
    setDiasAvisoEditado('');
    setDiasAvisoJustificativa('');
    setAdicionaisOpen(false);
    setHorasNoturnas('');
    setPercentualNoturno('20');
    setPericulosidade('');
    setInsalubridadeGrau('');
    setInsalubridadeBase('');
    setQuebraCaixaPercentual('');
    setVrValorDia('');
    setVrDiasUteis('');
    setAtsPercentual('');
    setAtsAnos('');
    setComissao('');
    setGratificacao('');
    setHorasContratoMensal('220');
    setQuantidadeHe50('');
    setQuantidadeHe100('');
    setIntrajornadaHoras('');
    setIntrajornadaFator('1.5');
    setInterjornadaHoras('');
    setInterjornadaFator('1.5');
    setDsrDiasUteis('22');
    setDsrDiasNaoUteis('5');
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
      diasAvisoConfig: {
        calculado: diasAvisoCalculado,
        editado: diasAvisoEditado ? parseInt(diasAvisoEditado) : undefined,
        justificativa: diasAvisoJustificativa || undefined,
      },
      adicionais: {
        adicionalNoturno: horasNoturnas ? {
          horasNoturnas: parseFloat(horasNoturnas.replace(',', '.')) || 0,
          percentual: parseFloat(percentualNoturno) / 100 || 0.20,
        } : undefined,
        periculosidade: periculosidade ? parseFloat(periculosidade.replace(',', '.')) / 100 : undefined,
        insalubridade: insalubridadeGrau && insalubridadeBase ? {
          grau: insalubridadeGrau as 'minimo' | 'medio' | 'maximo',
          base: parseCurrency(insalubridadeBase),
        } : undefined,
        quebraCaixaPercentual: quebraCaixaPercentual ? parseFloat(quebraCaixaPercentual) / 100 : undefined,
        valeRefeicao: vrValorDia && vrDiasUteis ? {
          valorDia: parseCurrency(vrValorDia),
          diasUteis: parseInt(vrDiasUteis) || 0,
        } : undefined,
        ats: atsPercentual && atsAnos ? {
          percentual: parseFloat(atsPercentual.replace(',', '.')) / 100 || 0,
          anosAplicaveis: parseInt(atsAnos) || 0,
        } : undefined,
        gratificacao: parseCurrency(gratificacao) || undefined,
        comissao: parseCurrency(comissao) || undefined,
        horaExtra: (quantidadeHe50 || quantidadeHe100) ? {
          horasContratoMensal: parseInt(horasContratoMensal) || 220,
          quantidadeHe50: parseFloat(quantidadeHe50.replace(',', '.')) || 0,
          quantidadeHe100: parseFloat(quantidadeHe100.replace(',', '.')) || 0,
        } : undefined,
        intrajornada: intrajornadaHoras ? {
          horas: parseFloat(intrajornadaHoras.replace(',', '.')) || 0,
          fator: parseFloat(intrajornadaFator) || 1.5,
        } : undefined,
        interjornada: interjornadaHoras ? {
          horas: parseFloat(interjornadaHoras.replace(',', '.')) || 0,
          fator: parseFloat(interjornadaFator) || 1.5,
        } : undefined,
        dsrConfig: {
          diasUteis: parseInt(dsrDiasUteis) || 22,
          diasNaoUteis: parseInt(dsrDiasNaoUteis) || 5,
        },
      },
    };

    onCalculate(dados);
  };

  const showFaltasDsrWarning = parseFloat(faltasDias.replace(',', '.')) > 0 && parseCurrency(dsrFaltas) === 0;
  const dsrDiasUteisInvalid = parseInt(dsrDiasUteis) === 0;

  return (
    <Card className="card-elevated">
      <CardHeader className="header-gradient text-primary-foreground rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calculator className="h-5 w-5" />
              Dados da Rescisão
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Preencha as informações do funcionário
            </CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar dados</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja limpar todos os dados do formulário? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleLimparDados}>Limpar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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

          {/* Datas - Input híbrido (digitação + calendário) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Admissão *</Label>
              <div className="flex gap-2">
                <Input
                  value={dataAdmissaoText}
                  onChange={(e) => handleDateTextChange(e.target.value, setDataAdmissaoText, setDataAdmissao)}
                  placeholder="dd/mm/aaaa"
                  className="font-mono flex-1"
                  maxLength={10}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" type="button">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={dataAdmissao}
                      onSelect={(date) => handleCalendarSelect(date, setDataAdmissao, setDataAdmissaoText)}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {dataAdmissaoText.length === 10 && !dataAdmissao && (
                <p className="text-xs text-destructive">Data inválida</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data de Desligamento *</Label>
              <div className="flex gap-2">
                <Input
                  value={dataDesligamentoText}
                  onChange={(e) => handleDateTextChange(e.target.value, setDataDesligamentoText, setDataDesligamento)}
                  placeholder="dd/mm/aaaa"
                  className="font-mono flex-1"
                  maxLength={10}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" type="button">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={dataDesligamento}
                      onSelect={(date) => handleCalendarSelect(date, setDataDesligamento, setDataDesligamentoText)}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {dataDesligamentoText.length === 10 && !dataDesligamento && (
                <p className="text-xs text-destructive">Data inválida</p>
              )}
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
              <Label htmlFor="diasTrabalhados" className="flex items-center gap-1">
                Dias Trabalhados no Mês
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Preenchido automaticamente com o dia da data de desligamento
                  </TooltipContent>
                </Tooltip>
              </Label>
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

          {/* Dias de Aviso Editável */}
          {showAvisoOptions && tipoAviso === 'INDENIZADO' && dataAdmissao && dataDesligamento && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Dias de Aviso Prévio
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Calculado automaticamente:</span>
                    <span className="font-mono font-medium">{diasAvisoCalculado} dias</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    30 dias + 3 dias por ano trabalhado (máx. 90 dias)
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="diasAvisoEditado" className="text-sm">Dias editados (opcional)</Label>
                    <Input
                      id="diasAvisoEditado"
                      type="number"
                      min="0"
                      max="90"
                      value={diasAvisoEditado}
                      onChange={(e) => setDiasAvisoEditado(e.target.value)}
                      className="font-mono"
                      placeholder={diasAvisoCalculado.toString()}
                    />
                  </div>
                  {diasAvisoEditado && diasAvisoEditado !== diasAvisoCalculado.toString() && (
                    <div className="space-y-2">
                      <Label htmlFor="diasAvisoJustificativa" className="text-sm text-amber-600">
                        Justificativa (obrigatória) *
                      </Label>
                      <Textarea
                        id="diasAvisoJustificativa"
                        value={diasAvisoJustificativa}
                        onChange={(e) => setDiasAvisoJustificativa(e.target.value)}
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
                <div className="grid grid-cols-3 gap-3">
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
                    <Label className="text-xs">Percentual</Label>
                    <Select value={percentualNoturno} onValueChange={setPercentualNoturno}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20%</SelectItem>
                        <SelectItem value="25">25%</SelectItem>
                        <SelectItem value="30">30%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Valor (automático)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        value={adicionalNoturnoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        className="pl-8 font-mono bg-muted"
                        readOnly
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
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-medium">Quebra de Caixa (% do Salário Base)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Percentual</Label>
                    <Select value={quebraCaixaPercentual} onValueChange={setQuebraCaixaPercentual}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Não possui</SelectItem>
                        <SelectItem value="8">8%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Valor (automático)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        value={quebraCaixaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        className="pl-8 font-mono bg-muted"
                        readOnly
                      />
                    </div>
                  </div>
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

              {/* Gratificação */}
              <div className="space-y-2">
                <Label className="text-sm">Gratificações</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    value={gratificacao}
                    onChange={handleCurrencyChange(setGratificacao)}
                    className="pl-10 font-mono"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Comissão e Hora Extra */}
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-medium">Comissão, Hora Extra e DSR</h5>
                <p className="text-xs text-muted-foreground">
                  Base HE = Salário + ATS + Comissão + Insalubridade + Gratificação + Periculosidade
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
                    <Label className="text-xs">Jornada Mensal (horas)</Label>
                    <Select value={horasContratoMensal} onValueChange={setHorasContratoMensal}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="220">220h (8h/dia)</SelectItem>
                        <SelectItem value="110">110h (4h/dia)</SelectItem>
                        <SelectItem value="180">180h (6h/dia)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Qtd. Horas Extras 50%</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={quantidadeHe50}
                      onChange={(e) => setQuantidadeHe50(e.target.value)}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Qtd. Horas Extras 100%</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={quantidadeHe100}
                      onChange={(e) => setQuantidadeHe100(e.target.value)}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Valor hora calculado */}
                {salarioBase && (
                  <div className="p-2 bg-muted/50 rounded text-xs">
                    <span className="text-muted-foreground">Valor Hora Calculado: </span>
                    <span className="font-mono font-medium">
                      R$ {valorHoraCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Intrajornada e Interjornada */}
              <div className="border rounded-lg p-4 space-y-3">
                <h5 className="text-sm font-medium">Intrajornada e Interjornada (tratadas como HE)</h5>
                <p className="text-xs text-muted-foreground">
                  Usam a mesma Base HE e Valor Hora calculados acima
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Intrajornada */}
                  <div className="space-y-2 border rounded p-3">
                    <Label className="text-xs font-medium">Intrajornada</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Horas</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={intrajornadaHoras}
                          onChange={(e) => setIntrajornadaHoras(e.target.value)}
                          className="font-mono"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Fator</Label>
                        <Select value={intrajornadaFator} onValueChange={setIntrajornadaFator}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1.0">× 1,0</SelectItem>
                            <SelectItem value="1.5">× 1,5</SelectItem>
                            <SelectItem value="2.0">× 2,0</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Valor: </span>
                      <span className="font-mono">R$ {intrajornadaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  
                  {/* Interjornada */}
                  <div className="space-y-2 border rounded p-3">
                    <Label className="text-xs font-medium">Interjornada</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Horas</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={interjornadaHoras}
                          onChange={(e) => setInterjornadaHoras(e.target.value)}
                          className="font-mono"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Fator</Label>
                        <Select value={interjornadaFator} onValueChange={setInterjornadaFator}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1.0">× 1,0</SelectItem>
                            <SelectItem value="1.5">× 1,5</SelectItem>
                            <SelectItem value="2.0">× 2,0</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Valor: </span>
                      <span className="font-mono">R$ {interjornadaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DSR sobre Variáveis - Configurável */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium">DSR sobre Variáveis</h5>
                  <Dialog open={dsrDialogOpen} onOpenChange={setDsrDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" type="button" className="h-7 px-2">
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Configurar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configurar DSR sobre Variáveis</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Dias Úteis do Mês (Seg–Sáb)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={dsrDiasUteis}
                            onChange={(e) => setDsrDiasUteis(e.target.value)}
                            className="font-mono"
                          />
                          {dsrDiasUteisInvalid && (
                            <p className="text-xs text-destructive">Dias úteis não pode ser zero</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Dias Não Úteis (Domingos + Feriados)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="31"
                            value={dsrDiasNaoUteis}
                            onChange={(e) => setDsrDiasNaoUteis(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <p className="text-sm text-muted-foreground">Fórmula:</p>
                          <p className="text-sm font-mono">
                            DSR = (Variáveis ÷ {dsrDiasUteis || '?'}) × {dsrDiasNaoUteis || '?'}
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={() => setDsrDialogOpen(false)}>Confirmar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-xs text-muted-foreground">
                    DSR: {dsrDiasUteis} úteis / {dsrDiasNaoUteis} não úteis
                  </span>
                  <span className="font-mono text-sm">
                    R$ {(dsrDiasUteisInvalid ? 0 : dsrVariaveisValor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {dsrDiasUteisInvalid && (
                  <p className="text-xs text-destructive">Dias úteis não pode ser zero - configure o DSR</p>
                )}
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
