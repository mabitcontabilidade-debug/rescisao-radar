import { rescisaoConfig, CategoriaKey } from './rescisao-config';

export interface DadosAdicionais {
  adicionalNoturno?: {
    horasNoturnas: number;
    percentual: number; // 0.20, 0.25, 0.30, 0.50
  };
  periculosidade?: number; // 0.30 = 30%
  insalubridade?: {
    grau: 'minimo' | 'medio' | 'maximo'; // 10%, 20%, 40%
    base: number; // Salário mínimo ou base configurável
  };
  quebraCaixaPercentual?: number; // 0.08, 0.10, 0.20
  valeRefeicao?: {
    valorDia: number;
    diasUteis: number;
  };
  ats?: {
    percentual: number; // Ex: 0.01 = 1% por ano
    anosAplicaveis: number;
  };
  gratificacao?: number; // Valor de gratificações
  comissao?: number;
  horaExtra?: {
    horasContratoMensal: number; // 220 ou 110
    quantidadeHe50: number; // Quantidade de horas extras 50%
    quantidadeHe100: number; // Quantidade de horas extras 100%
  };
  intrajornada?: {
    horas: number;
    fator: number; // 1.0, 1.5, 2.0
  };
  interjornada?: {
    horas: number;
    fator: number;
  };
  dsrConfig?: {
    diasUteis: number;
    diasNaoUteis: number;
  };
}

export interface BaseHoraExtraDetalhada {
  salarioBase: number;
  ats: number;
  comissao: number;
  insalubridade: number;
  gratificacao: number;
  periculosidade: number;
  total: number;
  divisor: number;
  valorHora: number;
  he50: {
    quantidade: number;
    fator: number;
    valor: number;
  };
  he100: {
    quantidade: number;
    fator: number;
    valor: number;
  };
  intrajornada?: {
    horas: number;
    fator: number;
    valor: number;
  };
  interjornada?: {
    horas: number;
    fator: number;
    valor: number;
  };
  totalHoraExtra: number;
}

export interface DadosRescisao {
  salarioBase: number;
  dataAdmissao: Date;
  dataDesligamento: Date;
  motivoCodigo: string;
  tipoContrato: string;
  tipoAviso: string;
  diasTrabalhados: number;
  mesesFeriasVencidas: number;
  periodosFeriasVencidas: number;
  saldoFgts: number;
  dependentesIrrf: number;
  mediaVariaveis: number;
  descontoAvisoDias: number;
  dataTerminoContrato?: Date;
  // Faltas fracionadas
  faltasDias: number;
  dsrFaltas: number;
  // Avos editáveis
  avosFerias?: {
    calculado: number;
    editado?: number;
    justificativa?: string;
  };
  avos13?: {
    calculado: number;
    editado?: number;
    justificativa?: string;
  };
  // Dias de aviso editável
  diasAvisoConfig?: {
    calculado: number;
    editado?: number;
    justificativa?: string;
  };
  // Adicionais
  adicionais?: DadosAdicionais;
}

export interface ResultadoVerba {
  rubrica: string;
  descricao: string;
  valor: number;
  tipo: 'provento' | 'desconto';
  incideInss: boolean;
  incideIrrf: boolean;
  incideFgts: boolean;
  grupoIrrf?: 'MENSAL' | 'DECIMO_TERCEIRO' | 'NAO_APLICA';
}

export interface LogEntry {
  timestamp: Date;
  tipo: 'INFO' | 'AVISO' | 'MANUAL';
  mensagem: string;
}

export interface ResultadoRescisao {
  verbas: ResultadoVerba[];
  totalProventos: number;
  totalDescontos: number;
  inss: number;
  inssMensal: number;
  inss13: number;
  irrf: number;
  irrfMensal: number;
  irrf13: number;
  liquido: number;
  multaFgts: number;
  diasAviso: number;
  meses13: number;
  mesesFerias: number;
  logs: LogEntry[];
  // Avos utilizados
  avosFeriasUtilizado: number;
  avos13Utilizado: number;
  // Dias de aviso utilizados
  diasAvisoUtilizado: number;
  // Base de hora extra detalhada (para demonstrativo)
  baseHoraExtra?: BaseHoraExtraDetalhada;
  // DSR configuração
  dsrConfig?: {
    diasUteis: number;
    diasNaoUteis: number;
    valorDsr: number;
  };
}

function calcularDiferencaMeses(dataInicio: Date, dataFim: Date): number {
  const anos = dataFim.getFullYear() - dataInicio.getFullYear();
  const meses = dataFim.getMonth() - dataInicio.getMonth();
  const dias = dataFim.getDate() - dataInicio.getDate();
  
  let totalMeses = anos * 12 + meses;
  if (dias >= 15) totalMeses++;
  
  return Math.max(0, totalMeses);
}

function calcularDiasVinculo(dataInicio: Date, dataFim: Date): number {
  const diff = dataFim.getTime() - dataInicio.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function calcularDiasAviso(diasVinculo: number): number {
  const anosCompletos = Math.floor(diasVinculo / 365);
  // 30 dias base + 3 dias por ano completo trabalhado (após o primeiro ano)
  // Máximo de 60 dias adicionais = 90 dias total
  return Math.min(30 + Math.max(0, anosCompletos - 1) * 3, 90);
}

function calcularInssProgressivo(base: number): number {
  const { faixas, teto } = rescisaoConfig.tabelas.inss;
  const baseCalculo = Math.min(base, teto);
  let inss = 0;
  let baseRestante = baseCalculo;
  let faixaAnterior = 0;

  for (const faixa of faixas) {
    const faixaValor = faixa.ate - faixaAnterior;
    const baseNaFaixa = Math.min(baseRestante, faixaValor);
    
    if (baseNaFaixa > 0) {
      inss += baseNaFaixa * faixa.aliquota;
      baseRestante -= baseNaFaixa;
    }
    
    faixaAnterior = faixa.ate;
    if (baseRestante <= 0) break;
  }

  return inss;
}

function calcularIrrf(base: number, dependentes: number, inss: number): number {
  const valorDependente = rescisaoConfig.defaults.valor_dependente_irrf;
  const baseCalculo = base - inss - (dependentes * valorDependente);
  
  if (baseCalculo <= 0) return 0;

  const { faixas } = rescisaoConfig.tabelas.irrf;
  
  for (const faixa of faixas) {
    const de = 'de' in faixa ? faixa.de : 0;
    const ate = faixa.ate ?? Infinity;
    if (baseCalculo >= de && baseCalculo <= ate) {
      return Math.max(0, baseCalculo * faixa.aliquota - faixa.deduzir);
    }
  }
  
  return 0;
}

export function calcularRescisao(dados: DadosRescisao): ResultadoRescisao {
  const logs: LogEntry[] = [];
  
  const addLog = (tipo: LogEntry['tipo'], mensagem: string) => {
    logs.push({ timestamp: new Date(), tipo, mensagem });
  };

  const motivo = rescisaoConfig.motivos.find(m => m.codigo === dados.motivoCodigo);
  if (!motivo) throw new Error('Motivo não encontrado');
  
  const categoria = rescisaoConfig.categorias[motivo.categoriaBase as CategoriaKey];
  if (!categoria) throw new Error('Categoria não encontrada');

  // === Remuneração de Referência = Salário Base + Médias ===
  const remuneracaoReferencia = dados.salarioBase + dados.mediaVariaveis;
  addLog('INFO', `Remuneração de referência calculada: R$ ${remuneracaoReferencia.toFixed(2)} (Salário Base + Médias)`);
  
  const diasVinculo = calcularDiasVinculo(dados.dataAdmissao, dados.dataDesligamento);
  const mesesVinculo = calcularDiferencaMeses(dados.dataAdmissao, dados.dataDesligamento);
  
  const verbas: ResultadoVerba[] = [];
  
  // === Cálculo de adicionais ===
  let totalAdicionais = 0;
  let baseHoraExtraDetalhada: BaseHoraExtraDetalhada | undefined;
  
  if (dados.adicionais) {
    const { adicionais } = dados;
    
    // Calcular componentes da base de hora extra
    const valorATS = adicionais.ats 
      ? dados.salarioBase * adicionais.ats.percentual * adicionais.ats.anosAplicaveis 
      : 0;
    
    const grauPercent = { minimo: 0.10, medio: 0.20, maximo: 0.40 };
    const valorInsalubridade = adicionais.insalubridade
      ? adicionais.insalubridade.base * grauPercent[adicionais.insalubridade.grau]
      : 0;
    
    const valorPericulosidade = adicionais.periculosidade
      ? dados.salarioBase * adicionais.periculosidade
      : 0;
    
    const valorGratificacao = adicionais.gratificacao || 0;
    const comissaoValor = adicionais.comissao || 0;
    
    // Base hora extra = salário + ATS + comissões + insalubridade + gratificações + periculosidade
    const baseHoraExtra = dados.salarioBase + valorATS + comissaoValor + valorInsalubridade + valorGratificacao + valorPericulosidade;
    const divisor = adicionais.horaExtra?.horasContratoMensal || 220;
    const valorHora = baseHoraExtra / divisor;
    
    // ATS (Adicional por Tempo de Serviço)
    if (valorATS > 0) {
      totalAdicionais += valorATS;
      verbas.push({
        rubrica: 'ATS',
        descricao: `ATS (${adicionais.ats!.anosAplicaveis} anos x ${(adicionais.ats!.percentual * 100).toFixed(0)}%)`,
        valor: valorATS,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Adicional Noturno - usa valor hora calculado
    if (adicionais.adicionalNoturno && adicionais.adicionalNoturno.horasNoturnas > 0) {
      const fatorHoraReduzida = 60 / 52.5;
      const horasEquivalentes = adicionais.adicionalNoturno.horasNoturnas * fatorHoraReduzida;
      const valorNoturno = valorHora * adicionais.adicionalNoturno.percentual * horasEquivalentes;
      
      totalAdicionais += valorNoturno;
      verbas.push({
        rubrica: 'ADICIONAL_NOTURNO',
        descricao: `Adicional Noturno (${adicionais.adicionalNoturno.horasNoturnas}h × ${(adicionais.adicionalNoturno.percentual * 100).toFixed(0)}%)`,
        valor: valorNoturno,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
      
      addLog('INFO', `Adicional Noturno: ${adicionais.adicionalNoturno.horasNoturnas}h × (60/52,5) × R$ ${valorHora.toFixed(2)} × ${(adicionais.adicionalNoturno.percentual * 100).toFixed(0)}% = R$ ${valorNoturno.toFixed(2)}`);
    }
    
    // Periculosidade (30%)
    if (valorPericulosidade > 0) {
      totalAdicionais += valorPericulosidade;
      verbas.push({
        rubrica: 'PERICULOSIDADE',
        descricao: `Periculosidade (${(adicionais.periculosidade! * 100).toFixed(0)}%)`,
        valor: valorPericulosidade,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Insalubridade
    if (valorInsalubridade > 0) {
      const percentual = grauPercent[adicionais.insalubridade!.grau];
      totalAdicionais += valorInsalubridade;
      verbas.push({
        rubrica: 'INSALUBRIDADE',
        descricao: `Insalubridade (${(percentual * 100).toFixed(0)}%)`,
        valor: valorInsalubridade,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Quebra de Caixa (percentual do salário base)
    if (adicionais.quebraCaixaPercentual && adicionais.quebraCaixaPercentual > 0) {
      const quebraCaixaValor = dados.salarioBase * adicionais.quebraCaixaPercentual;
      totalAdicionais += quebraCaixaValor;
      verbas.push({
        rubrica: 'QUEBRA_CAIXA',
        descricao: `Quebra de Caixa (${(adicionais.quebraCaixaPercentual * 100).toFixed(0)}%)`,
        valor: quebraCaixaValor,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Vale Refeição (proporcional aos dias trabalhados)
    if (adicionais.valeRefeicao && adicionais.valeRefeicao.valorDia > 0) {
      const valorVR = adicionais.valeRefeicao.valorDia * adicionais.valeRefeicao.diasUteis;
      verbas.push({
        rubrica: 'VALE_REFEICAO',
        descricao: `Vale Refeição (${adicionais.valeRefeicao.diasUteis} dias)`,
        valor: valorVR,
        tipo: 'provento',
        incideInss: false,
        incideIrrf: false,
        incideFgts: false,
        grupoIrrf: 'NAO_APLICA',
      });
    }
    
    // Variáveis para DSR
    let totalVariaveis = comissaoValor;
    let heValor = 0;
    let intrajornadaValor = 0;
    let interjornadaValor = 0;
    
    // Calcular hora extra
    if (adicionais.horaExtra && (adicionais.horaExtra.quantidadeHe50 > 0 || adicionais.horaExtra.quantidadeHe100 > 0)) {
      const he50 = valorHora * 1.5 * adicionais.horaExtra.quantidadeHe50;
      const he100 = valorHora * 2.0 * adicionais.horaExtra.quantidadeHe100;
      heValor = he50 + he100;
      
      addLog('INFO', `Base Hora Extra: R$ ${baseHoraExtra.toFixed(2)} (Sal. Base: ${dados.salarioBase.toFixed(2)} + ATS: ${valorATS.toFixed(2)} + Comissão: ${comissaoValor.toFixed(2)} + Insalub.: ${valorInsalubridade.toFixed(2)} + Gratif.: ${valorGratificacao.toFixed(2)} + Pericul.: ${valorPericulosidade.toFixed(2)})`);
      addLog('INFO', `Valor Hora: R$ ${baseHoraExtra.toFixed(2)} ÷ ${divisor}h = R$ ${valorHora.toFixed(2)}`);
      if (adicionais.horaExtra.quantidadeHe50 > 0) {
        addLog('INFO', `HE 50%: R$ ${valorHora.toFixed(2)} × 1,5 × ${adicionais.horaExtra.quantidadeHe50}h = R$ ${he50.toFixed(2)}`);
      }
      if (adicionais.horaExtra.quantidadeHe100 > 0) {
        addLog('INFO', `HE 100%: R$ ${valorHora.toFixed(2)} × 2,0 × ${adicionais.horaExtra.quantidadeHe100}h = R$ ${he100.toFixed(2)}`);
      }
      
      baseHoraExtraDetalhada = {
        salarioBase: dados.salarioBase,
        ats: valorATS,
        comissao: comissaoValor,
        insalubridade: valorInsalubridade,
        gratificacao: valorGratificacao,
        periculosidade: valorPericulosidade,
        total: baseHoraExtra,
        divisor,
        valorHora,
        he50: {
          quantidade: adicionais.horaExtra.quantidadeHe50,
          fator: 1.5,
          valor: he50,
        },
        he100: {
          quantidade: adicionais.horaExtra.quantidadeHe100,
          fator: 2.0,
          valor: he100,
        },
        totalHoraExtra: heValor,
      };
    }
    
    // Intrajornada (tratada como HE)
    if (adicionais.intrajornada && adicionais.intrajornada.horas > 0) {
      intrajornadaValor = valorHora * adicionais.intrajornada.fator * adicionais.intrajornada.horas;
      
      verbas.push({
        rubrica: 'INTRAJORNADA',
        descricao: `Intrajornada (${adicionais.intrajornada.horas}h × ${adicionais.intrajornada.fator.toFixed(1)})`,
        valor: intrajornadaValor,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
      
      addLog('INFO', `Intrajornada: R$ ${valorHora.toFixed(2)} × ${adicionais.intrajornada.fator.toFixed(1)} × ${adicionais.intrajornada.horas}h = R$ ${intrajornadaValor.toFixed(2)}`);
      
      if (baseHoraExtraDetalhada) {
        baseHoraExtraDetalhada.intrajornada = {
          horas: adicionais.intrajornada.horas,
          fator: adicionais.intrajornada.fator,
          valor: intrajornadaValor,
        };
        baseHoraExtraDetalhada.totalHoraExtra += intrajornadaValor;
      }
    }
    
    // Interjornada (tratada como HE)
    if (adicionais.interjornada && adicionais.interjornada.horas > 0) {
      interjornadaValor = valorHora * adicionais.interjornada.fator * adicionais.interjornada.horas;
      
      verbas.push({
        rubrica: 'INTERJORNADA',
        descricao: `Interjornada (${adicionais.interjornada.horas}h × ${adicionais.interjornada.fator.toFixed(1)})`,
        valor: interjornadaValor,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
      
      addLog('INFO', `Interjornada: R$ ${valorHora.toFixed(2)} × ${adicionais.interjornada.fator.toFixed(1)} × ${adicionais.interjornada.horas}h = R$ ${interjornadaValor.toFixed(2)}`);
      
      if (baseHoraExtraDetalhada) {
        baseHoraExtraDetalhada.interjornada = {
          horas: adicionais.interjornada.horas,
          fator: adicionais.interjornada.fator,
          valor: interjornadaValor,
        };
        baseHoraExtraDetalhada.totalHoraExtra += interjornadaValor;
      }
    }
    
    // Adicionar comissão como verba
    if (comissaoValor > 0) {
      verbas.push({
        rubrica: 'COMISSAO',
        descricao: 'Comissões',
        valor: comissaoValor,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Adicionar hora extra como verba
    if (heValor > 0 && baseHoraExtraDetalhada) {
      let heDescricao = 'Hora Extra';
      const partes: string[] = [];
      if (baseHoraExtraDetalhada.he50.quantidade > 0) partes.push(`${baseHoraExtraDetalhada.he50.quantidade}h 50%`);
      if (baseHoraExtraDetalhada.he100.quantidade > 0) partes.push(`${baseHoraExtraDetalhada.he100.quantidade}h 100%`);
      if (partes.length > 0) heDescricao += ` (${partes.join(' + ')})`;
      
      verbas.push({
        rubrica: 'HORA_EXTRA',
        descricao: heDescricao,
        valor: heValor,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Gratificação (se não usada na base de HE, aparece como verba separada)
    if (valorGratificacao > 0 && !baseHoraExtraDetalhada) {
      verbas.push({
        rubrica: 'GRATIFICACAO',
        descricao: 'Gratificações',
        valor: valorGratificacao,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Total de variáveis para DSR
    totalVariaveis += heValor + intrajornadaValor + interjornadaValor;
    
    // Adicional noturno também entra nas variáveis para DSR
    if (adicionais.adicionalNoturno && adicionais.adicionalNoturno.horasNoturnas > 0) {
      const fatorHoraReduzida = 60 / 52.5;
      const horasEquivalentes = adicionais.adicionalNoturno.horasNoturnas * fatorHoraReduzida;
      const valorNoturno = valorHora * adicionais.adicionalNoturno.percentual * horasEquivalentes;
      totalVariaveis += valorNoturno;
    }
    
    // DSR único sobre variáveis (calculado automaticamente)
    if (adicionais.dsrConfig && totalVariaveis > 0) {
      const { diasUteis, diasNaoUteis } = adicionais.dsrConfig;
      
      if (diasUteis > 0) {
        const dsrValor = (totalVariaveis / diasUteis) * diasNaoUteis;
        
        verbas.push({
          rubrica: 'DSR_VARIAVEIS',
          descricao: `DSR sobre Variáveis (${diasUteis} úteis / ${diasNaoUteis} não úteis)`,
          valor: dsrValor,
          tipo: 'provento',
          incideInss: true,
          incideIrrf: true,
          incideFgts: true,
          grupoIrrf: 'MENSAL',
        });
        addLog('INFO', `DSR calculado: (R$ ${totalVariaveis.toFixed(2)} ÷ ${diasUteis}) × ${diasNaoUteis} = R$ ${dsrValor.toFixed(2)}`);
      }
    }
  }
  
  // === Faltas fracionadas ===
  const faltasValor = dados.faltasDias > 0 
    ? (remuneracaoReferencia / 30) * dados.faltasDias 
    : 0;
    
  if (dados.faltasDias > 0) {
    verbas.push({
      rubrica: 'DESCONTO_FALTAS',
      descricao: `Desconto de Faltas (${dados.faltasDias} dia${dados.faltasDias !== 1 ? 's' : ''})`,
      valor: faltasValor,
      tipo: 'desconto',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      grupoIrrf: 'NAO_APLICA',
    });
    
    // DSR sobre faltas é obrigatório quando há faltas
    if (dados.dsrFaltas > 0) {
      verbas.push({
        rubrica: 'DESCONTO_DSR_FALTAS',
        descricao: 'Desconto DSR por Faltas',
        valor: dados.dsrFaltas,
        tipo: 'desconto',
        incideInss: false,
        incideIrrf: false,
        incideFgts: false,
        grupoIrrf: 'NAO_APLICA',
      });
    } else {
      addLog('AVISO', 'Faltas informadas sem DSR correspondente - verifique se aplicável');
    }
  }
  
  // Saldo de Salário (descontando faltas)
  if (categoria.saldo_salario) {
    const diasEfetivos = Math.max(0, dados.diasTrabalhados - dados.faltasDias);
    const saldoSalario = (remuneracaoReferencia / 30) * diasEfetivos;
    verbas.push({
      rubrica: 'SALDO_SALARIO',
      descricao: `Saldo de Salário (${diasEfetivos} dias)`,
      valor: saldoSalario,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      grupoIrrf: 'MENSAL',
    });
  }

  // === Avos editáveis ===
  const mesesFeriasCalculado = mesesVinculo % 12;
  const meses13Calculado = dados.dataDesligamento.getMonth() + 1;
  
  // Determinar avos a usar (editado ou calculado)
  let avosFeriasUtilizado = mesesFeriasCalculado;
  let avos13Utilizado = meses13Calculado;
  
  if (dados.avosFerias?.editado !== undefined && dados.avosFerias.editado !== dados.avosFerias.calculado) {
    avosFeriasUtilizado = dados.avosFerias.editado;
    addLog('MANUAL', `Avos de férias alterado de ${dados.avosFerias.calculado}/12 para ${dados.avosFerias.editado}/12. Justificativa: ${dados.avosFerias.justificativa || 'Não informada'}`);
  }
  
  if (dados.avos13?.editado !== undefined && dados.avos13.editado !== dados.avos13.calculado) {
    avos13Utilizado = dados.avos13.editado;
    addLog('MANUAL', `Avos de 13º alterado de ${dados.avos13.calculado}/12 para ${dados.avos13.editado}/12. Justificativa: ${dados.avos13.justificativa || 'Não informada'}`);
  }

  // === Dias de aviso editável ===
  const diasAvisoCalculado = calcularDiasAviso(diasVinculo);
  let diasAvisoUtilizado = diasAvisoCalculado;
  
  if (dados.diasAvisoConfig?.editado !== undefined && dados.diasAvisoConfig.editado !== dados.diasAvisoConfig.calculado) {
    diasAvisoUtilizado = dados.diasAvisoConfig.editado;
    addLog('MANUAL', `Dias de aviso alterado de ${dados.diasAvisoConfig.calculado} para ${dados.diasAvisoConfig.editado}. Justificativa: ${dados.diasAvisoConfig.justificativa || 'Não informada'}`);
  }

  // === Base única de férias para cálculo do 1/3 ===
  let baseFeriasTotal = 0;
  let feriasIndenizadasAviso = 0;
  
  // Férias Vencidas
  if (categoria.ferias_vencidas && dados.periodosFeriasVencidas > 0) {
    const feriasVencidas = remuneracaoReferencia * dados.periodosFeriasVencidas;
    baseFeriasTotal += feriasVencidas;
    
    verbas.push({
      rubrica: 'FERIAS_VENCIDAS',
      descricao: `Férias Vencidas (${dados.periodosFeriasVencidas} período${dados.periodosFeriasVencidas > 1 ? 's' : ''})`,
      valor: feriasVencidas,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      grupoIrrf: 'NAO_APLICA',
    });
  }

  // Férias Proporcionais
  if (categoria.ferias_prop && avosFeriasUtilizado > 0) {
    const feriasProporcionais = (remuneracaoReferencia / 12) * avosFeriasUtilizado;
    baseFeriasTotal += feriasProporcionais;
    
    verbas.push({
      rubrica: 'FERIAS_PROP',
      descricao: `Férias Proporcionais (${avosFeriasUtilizado}/12)`,
      valor: feriasProporcionais,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      grupoIrrf: 'NAO_APLICA',
    });
  }

  // === 13º como base única ===
  let base13Total = 0;
  
  // 13º Salário Proporcional
  if (categoria.decimo_terceiro) {
    const decimoTerceiro = (remuneracaoReferencia / 12) * avos13Utilizado;
    base13Total += decimoTerceiro;
    
    verbas.push({
      rubrica: 'DECIMO_TERCEIRO',
      descricao: `13º Salário Proporcional (${avos13Utilizado}/12)`,
      valor: decimoTerceiro,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      grupoIrrf: 'DECIMO_TERCEIRO',
    });
  }

  // Aviso Prévio - usando remuneracaoReferencia (salário + médias)
  const fatorAviso = (categoria as any).fator_aviso ?? 1;
  
  if (categoria.aviso && dados.tipoAviso === 'INDENIZADO') {
    // Aviso usa salário base + médias
    const avisoIndenizado = (remuneracaoReferencia / 30) * diasAvisoUtilizado * fatorAviso;
    
    verbas.push({
      rubrica: 'AVISO_PREVIO_INDENIZADO',
      descricao: `Aviso Prévio Indenizado (${diasAvisoUtilizado} dias${fatorAviso < 1 ? ' - 50%' : ''})`,
      valor: avisoIndenizado,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: true,
      grupoIrrf: 'NAO_APLICA',
    });
    addLog('INFO', `Aviso indenizado calculado sobre Salário Base + Médias: R$ ${remuneracaoReferencia.toFixed(2)} × ${diasAvisoUtilizado} dias`);

    // === Avos indenizados por projeção do aviso (separados) ===
    if (categoria.reflexos_aviso) {
      const mesesProjecao = Math.ceil(diasAvisoUtilizado / 30);
      
      // 13º indenizado por projeção do aviso (separado)
      const decimo13Projecao = (remuneracaoReferencia / 12) * mesesProjecao;
      base13Total += decimo13Projecao;
      
      verbas.push({
        rubrica: 'DECIMO_TERCEIRO_PROJECAO_AVISO',
        descricao: `13º Indenizado - Projeção Aviso (${mesesProjecao}/12)`,
        valor: decimo13Projecao,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'DECIMO_TERCEIRO',
      });

      // Férias indenizadas por projeção do aviso (separado)
      const feriasProjecao = (remuneracaoReferencia / 12) * mesesProjecao;
      feriasIndenizadasAviso = feriasProjecao;
      baseFeriasTotal += feriasProjecao;
      
      verbas.push({
        rubrica: 'FERIAS_PROJECAO_AVISO',
        descricao: `Férias Indenizadas - Projeção Aviso (${mesesProjecao}/12)`,
        valor: feriasProjecao,
        tipo: 'provento',
        incideInss: false,
        incideIrrf: false,
        incideFgts: false,
        grupoIrrf: 'NAO_APLICA',
      });
      
      addLog('INFO', `Avos por projeção de aviso: ${mesesProjecao}/12 para Férias e 13º (rubricas separadas)`);
    }
  }
  
  // === 1/3 sobre base única de férias (vencidas + proporcionais + indenizadas aviso) ===
  if (baseFeriasTotal > 0) {
    const tercoFerias = baseFeriasTotal / 3;
    verbas.push({
      rubrica: 'TERCO_FERIAS',
      descricao: '1/3 Constitucional sobre Férias (base única)',
      valor: tercoFerias,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      grupoIrrf: 'NAO_APLICA',
    });
    addLog('INFO', `1/3 calculado sobre base única de férias (vencidas + proporcionais + projeção aviso): R$ ${baseFeriasTotal.toFixed(2)} → 1/3 = R$ ${tercoFerias.toFixed(2)}`);
  }

  // Desconto aviso não cumprido (Pedido de demissão) - também usa remuneracaoReferencia
  if ((categoria as any).desconto_aviso && dados.descontoAvisoDias > 0) {
    const descontoAviso = (remuneracaoReferencia / 30) * dados.descontoAvisoDias;
    
    verbas.push({
      rubrica: 'DESCONTO_AVISO_NAO_CUMPRIDO',
      descricao: `Desconto Aviso Não Cumprido (${dados.descontoAvisoDias} dias)`,
      valor: descontoAviso,
      tipo: 'desconto',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      grupoIrrf: 'NAO_APLICA',
    });
  }

  // Art. 479 - Indenização para contratos a termo
  if ((categoria as any).art_479 && dados.dataTerminoContrato) {
    const diasRestantes = calcularDiasVinculo(dados.dataDesligamento, dados.dataTerminoContrato);
    const indenizacao479 = ((remuneracaoReferencia / 30) * diasRestantes) * 0.5;
    
    verbas.push({
      rubrica: 'INDENIZACAO_ART_479',
      descricao: `Indenização Art. 479 (${diasRestantes} dias)`,
      valor: indenizacao479,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      grupoIrrf: 'NAO_APLICA',
    });
  }

  // Cálculo de totais
  const totalProventos = verbas
    .filter(v => v.tipo === 'provento')
    .reduce((acc, v) => acc + v.valor, 0);
  
  const totalDescontos = verbas
    .filter(v => v.tipo === 'desconto')
    .reduce((acc, v) => acc + v.valor, 0);

  // === INSS/IRRF separados por grupo ===
  // Base INSS Mensal
  const baseInssMensal = verbas
    .filter(v => v.incideInss && v.tipo === 'provento' && v.grupoIrrf === 'MENSAL')
    .reduce((acc, v) => acc + v.valor, 0);
  
  // Base INSS 13º (base única)
  const baseInss13 = base13Total;
  
  const inssMensal = calcularInssProgressivo(baseInssMensal);
  const inss13 = calcularInssProgressivo(baseInss13);
  const inss = inssMensal + inss13;
  
  addLog('INFO', `Base INSS Mensal: R$ ${baseInssMensal.toFixed(2)} → INSS: R$ ${inssMensal.toFixed(2)}`);
  addLog('INFO', `Base INSS 13º (base única): R$ ${baseInss13.toFixed(2)} → INSS: R$ ${inss13.toFixed(2)}`);

  // Base IRRF Mensal
  const baseIrrfMensal = verbas
    .filter(v => v.incideIrrf && v.tipo === 'provento' && v.grupoIrrf === 'MENSAL')
    .reduce((acc, v) => acc + v.valor, 0);
  
  // Base IRRF 13º (base única)
  const baseIrrf13 = base13Total;
  
  const irrfMensal = calcularIrrf(baseIrrfMensal, dados.dependentesIrrf, inssMensal);
  const irrf13 = calcularIrrf(baseIrrf13, dados.dependentesIrrf, inss13);
  const irrf = irrfMensal + irrf13;

  // Multa FGTS
  const multaFgts = dados.saldoFgts * categoria.multa_fgts_percent;
  
  if (multaFgts > 0) {
    verbas.push({
      rubrica: 'MULTA_FGTS',
      descricao: `Multa FGTS (${categoria.multa_fgts_percent * 100}%)`,
      valor: multaFgts,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      grupoIrrf: 'NAO_APLICA',
    });
  }

  const liquido = totalProventos + multaFgts - totalDescontos - inss - irrf;

  // DSR config para resultado
  let dsrConfigResult = undefined;
  if (dados.adicionais?.dsrConfig) {
    const { diasUteis, diasNaoUteis } = dados.adicionais.dsrConfig;
    const totalVariaveis = verbas
      .filter(v => ['COMISSAO', 'HORA_EXTRA', 'INTRAJORNADA', 'INTERJORNADA', 'ADICIONAL_NOTURNO'].includes(v.rubrica))
      .reduce((acc, v) => acc + v.valor, 0);
    const dsrValor = diasUteis > 0 ? (totalVariaveis / diasUteis) * diasNaoUteis : 0;
    dsrConfigResult = {
      diasUteis,
      diasNaoUteis,
      valorDsr: dsrValor,
    };
  }

  return {
    verbas,
    totalProventos: totalProventos + multaFgts,
    totalDescontos: totalDescontos + inss + irrf,
    inss,
    inssMensal,
    inss13,
    irrf,
    irrfMensal,
    irrf13,
    liquido,
    multaFgts,
    diasAviso: diasAvisoUtilizado,
    meses13: avos13Utilizado,
    mesesFerias: avosFeriasUtilizado,
    logs,
    avosFeriasUtilizado,
    avos13Utilizado,
    diasAvisoUtilizado,
    baseHoraExtra: baseHoraExtraDetalhada,
    dsrConfig: dsrConfigResult,
  };
}
