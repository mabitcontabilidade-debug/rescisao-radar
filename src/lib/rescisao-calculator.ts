import { rescisaoConfig, CategoriaKey } from './rescisao-config';

export interface DadosAdicionais {
  adicionalNoturno?: {
    horasNoturnas: number;
    valorHora: number;
  };
  periculosidade?: number; // 0.30 = 30%
  insalubridade?: {
    grau: 'minimo' | 'medio' | 'maximo'; // 10%, 20%, 40%
    base: number; // Salário mínimo ou base configurável
  };
  quebraCaixa?: number; // valor fixo
  valeRefeicao?: {
    valorDia: number;
    diasUteis: number;
  };
  ats?: {
    percentual: number; // Ex: 0.01 = 1% por ano
    anosAplicaveis: number;
  };
  comissao?: number;
  horaExtra?: {
    valor: number;
    percentualAdicional: number; // 0.50 ou 1.00
  };
  dsrSobreVariaveis?: number; // Valor do DSR sobre comissão+HE (calculado automaticamente ou manual)
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

// Calcula DSR sobre variáveis (comissão + HE) de forma unificada
function calcularDsrVariaveis(comissao: number, horaExtra: number, diasUteis: number, domingosEFeriados: number): number {
  if (diasUteis <= 0) return 0;
  const somaVariaveis = comissao + horaExtra;
  return (somaVariaveis / diasUteis) * domingosEFeriados;
}

// Calcula adicional noturno com hora reduzida (52:30)
function calcularAdicionalNoturno(horasNoturnas: number, valorHora: number): number {
  const fatorHoraReduzida = 60 / 52.5; // 1.1428...
  const adicionalNoturno = 0.20; // 20%
  return horasNoturnas * valorHora * fatorHoraReduzida * adicionalNoturno;
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

  // === CORREÇÃO 2: Remuneração de Referência = Salário Base + Médias ===
  const remuneracaoReferencia = dados.salarioBase + dados.mediaVariaveis;
  addLog('INFO', `Remuneração de referência calculada: R$ ${remuneracaoReferencia.toFixed(2)} (Salário Base + Médias)`);
  
  const diasVinculo = calcularDiasVinculo(dados.dataAdmissao, dados.dataDesligamento);
  const mesesVinculo = calcularDiferencaMeses(dados.dataAdmissao, dados.dataDesligamento);
  
  const verbas: ResultadoVerba[] = [];
  
  // === CORREÇÃO 7: Cálculo de adicionais ===
  let totalAdicionais = 0;
  
  if (dados.adicionais) {
    const { adicionais } = dados;
    
    // Adicional Noturno
    if (adicionais.adicionalNoturno && adicionais.adicionalNoturno.horasNoturnas > 0) {
      const valorNoturno = calcularAdicionalNoturno(
        adicionais.adicionalNoturno.horasNoturnas,
        adicionais.adicionalNoturno.valorHora
      );
      totalAdicionais += valorNoturno;
      verbas.push({
        rubrica: 'ADICIONAL_NOTURNO',
        descricao: `Adicional Noturno (${adicionais.adicionalNoturno.horasNoturnas}h)`,
        valor: valorNoturno,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Periculosidade (30%)
    if (adicionais.periculosidade && adicionais.periculosidade > 0) {
      const valorPericulosidade = dados.salarioBase * adicionais.periculosidade;
      totalAdicionais += valorPericulosidade;
      verbas.push({
        rubrica: 'PERICULOSIDADE',
        descricao: `Periculosidade (${(adicionais.periculosidade * 100).toFixed(0)}%)`,
        valor: valorPericulosidade,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // Insalubridade
    if (adicionais.insalubridade) {
      const grauPercent = { minimo: 0.10, medio: 0.20, maximo: 0.40 };
      const percentual = grauPercent[adicionais.insalubridade.grau];
      const valorInsalubridade = adicionais.insalubridade.base * percentual;
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
    
    // Quebra de Caixa
    if (adicionais.quebraCaixa && adicionais.quebraCaixa > 0) {
      totalAdicionais += adicionais.quebraCaixa;
      verbas.push({
        rubrica: 'QUEBRA_CAIXA',
        descricao: 'Quebra de Caixa',
        valor: adicionais.quebraCaixa,
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
    
    // ATS (Adicional por Tempo de Serviço)
    if (adicionais.ats && adicionais.ats.percentual > 0) {
      const valorATS = dados.salarioBase * adicionais.ats.percentual * adicionais.ats.anosAplicaveis;
      totalAdicionais += valorATS;
      verbas.push({
        rubrica: 'ATS',
        descricao: `ATS (${adicionais.ats.anosAplicaveis} anos x ${(adicionais.ats.percentual * 100).toFixed(0)}%)`,
        valor: valorATS,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'MENSAL',
      });
    }
    
    // === CORREÇÃO 6: DSR único sobre Comissão + HE ===
    if ((adicionais.comissao && adicionais.comissao > 0) || 
        (adicionais.horaExtra && adicionais.horaExtra.valor > 0)) {
      const comissaoValor = adicionais.comissao || 0;
      const heValor = adicionais.horaExtra?.valor || 0;
      
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
      
      if (heValor > 0) {
        const adicionalHE = adicionais.horaExtra?.percentualAdicional || 0.50;
        verbas.push({
          rubrica: 'HORA_EXTRA',
          descricao: `Hora Extra (${(adicionalHE * 100).toFixed(0)}%)`,
          valor: heValor,
          tipo: 'provento',
          incideInss: true,
          incideIrrf: true,
          incideFgts: true,
          grupoIrrf: 'MENSAL',
        });
      }
      
      // DSR único sobre a soma de comissão + HE
      if (dados.adicionais?.dsrSobreVariaveis && dados.adicionais.dsrSobreVariaveis > 0) {
        verbas.push({
          rubrica: 'DSR_VARIAVEIS',
          descricao: 'DSR sobre Variáveis (Comissão + HE)',
          valor: dados.adicionais.dsrSobreVariaveis,
          tipo: 'provento',
          incideInss: true,
          incideIrrf: true,
          incideFgts: true,
          grupoIrrf: 'MENSAL',
        });
        addLog('INFO', `DSR calculado sobre soma de variáveis (Comissão + HE): R$ ${dados.adicionais.dsrSobreVariaveis.toFixed(2)}`);
      }
    }
  }
  
  // === CORREÇÃO 3: Faltas fracionadas ===
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

  // === CORREÇÃO 1 & 4: Avos editáveis e 1/3 único ===
  // Calcular avos automaticamente
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

  // === CORREÇÃO 4: Base única de férias para cálculo do 1/3 ===
  let baseFeriasTotal = 0;
  
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
  
  // 1/3 sobre base única de férias (vencidas + proporcionais)
  if (baseFeriasTotal > 0) {
    const tercoFerias = baseFeriasTotal / 3;
    verbas.push({
      rubrica: 'TERCO_FERIAS',
      descricao: '1/3 Constitucional sobre Férias',
      valor: tercoFerias,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      grupoIrrf: 'NAO_APLICA',
    });
    addLog('INFO', `1/3 calculado sobre base única de férias: R$ ${baseFeriasTotal.toFixed(2)} → 1/3 = R$ ${tercoFerias.toFixed(2)}`);
  }

  // === CORREÇÃO 5: 13º como base única ===
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
  const diasAviso = calcularDiasAviso(diasVinculo);
  const fatorAviso = (categoria as any).fator_aviso ?? 1;
  
  if (categoria.aviso && dados.tipoAviso === 'INDENIZADO') {
    // === CORREÇÃO 2: Aviso usa salário base + médias ===
    const avisoIndenizado = (remuneracaoReferencia / 30) * diasAviso * fatorAviso;
    
    verbas.push({
      rubrica: 'AVISO_PREVIO_INDENIZADO',
      descricao: `Aviso Prévio Indenizado (${diasAviso} dias${fatorAviso < 1 ? ' - 50%' : ''})`,
      valor: avisoIndenizado,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: true,
      grupoIrrf: 'NAO_APLICA',
    });
    addLog('INFO', `Aviso indenizado calculado sobre Salário Base + Médias: R$ ${remuneracaoReferencia.toFixed(2)}`);

    // Reflexos sobre aviso
    if (categoria.reflexos_aviso) {
      const mesesProjecao = Math.ceil(diasAviso / 30);
      
      // Reflexo 13º (soma à base do 13º)
      const reflexo13 = (remuneracaoReferencia / 12) * mesesProjecao;
      base13Total += reflexo13;
      
      verbas.push({
        rubrica: 'REFLEXO_13_SOBRE_AVISO',
        descricao: `13º sobre Aviso Prévio (${mesesProjecao}/12)`,
        valor: reflexo13,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
        grupoIrrf: 'DECIMO_TERCEIRO',
      });

      // Reflexo Férias sobre aviso
      const reflexoFerias = (remuneracaoReferencia / 12) * mesesProjecao;
      const tercoReflexoFerias = reflexoFerias / 3;
      
      verbas.push({
        rubrica: 'REFLEXO_FERIAS_SOBRE_AVISO',
        descricao: `Férias sobre Aviso Prévio (${mesesProjecao}/12)`,
        valor: reflexoFerias,
        tipo: 'provento',
        incideInss: false,
        incideIrrf: false,
        incideFgts: false,
        grupoIrrf: 'NAO_APLICA',
      });
      
      verbas.push({
        rubrica: 'TERCO_REFLEXO_FERIAS_SOBRE_AVISO',
        descricao: '1/3 Férias sobre Aviso Prévio',
        valor: tercoReflexoFerias,
        tipo: 'provento',
        incideInss: false,
        incideIrrf: false,
        incideFgts: false,
        grupoIrrf: 'NAO_APLICA',
      });
    }
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

  // === CORREÇÃO 5: INSS/IRRF separados por grupo ===
  // Base INSS Mensal
  const baseInssMensal = verbas
    .filter(v => v.incideInss && v.tipo === 'provento' && v.grupoIrrf === 'MENSAL')
    .reduce((acc, v) => acc + v.valor, 0);
  
  // Base INSS 13º
  const baseInss13 = verbas
    .filter(v => v.incideInss && v.tipo === 'provento' && v.grupoIrrf === 'DECIMO_TERCEIRO')
    .reduce((acc, v) => acc + v.valor, 0);
  
  const inssMensal = calcularInssProgressivo(baseInssMensal);
  const inss13 = calcularInssProgressivo(baseInss13);
  const inss = inssMensal + inss13;
  
  addLog('INFO', `Base INSS Mensal: R$ ${baseInssMensal.toFixed(2)} → INSS: R$ ${inssMensal.toFixed(2)}`);
  addLog('INFO', `Base INSS 13º (total): R$ ${baseInss13.toFixed(2)} → INSS: R$ ${inss13.toFixed(2)}`);

  // Base IRRF Mensal
  const baseIrrfMensal = verbas
    .filter(v => v.incideIrrf && v.tipo === 'provento' && v.grupoIrrf === 'MENSAL')
    .reduce((acc, v) => acc + v.valor, 0);
  
  // Base IRRF 13º
  const baseIrrf13 = verbas
    .filter(v => v.incideIrrf && v.tipo === 'provento' && v.grupoIrrf === 'DECIMO_TERCEIRO')
    .reduce((acc, v) => acc + v.valor, 0);
  
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
    diasAviso,
    meses13: avos13Utilizado,
    mesesFerias: avosFeriasUtilizado,
    logs,
    avosFeriasUtilizado,
    avos13Utilizado,
  };
}
