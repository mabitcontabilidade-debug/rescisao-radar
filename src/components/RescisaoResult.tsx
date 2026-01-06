import { ArrowDownCircle, ArrowUpCircle, FileText, TrendingUp, Wallet, ClipboardList, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResultadoRescisao, ResultadoVerba } from '@/lib/rescisao-calculator';

interface RescisaoResultProps {
  resultado: ResultadoRescisao;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function VerbaRow({ verba }: { verba: ResultadoVerba }) {
  const isDesconto = verba.tipo === 'desconto';
  
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {isDesconto ? (
          <ArrowDownCircle className="h-5 w-5 text-desconto" />
        ) : (
          <ArrowUpCircle className="h-5 w-5 text-provento" />
        )}
        <div>
          <p className="font-medium text-foreground">{verba.descricao}</p>
          <div className="flex gap-1 mt-1">
            {verba.incideInss && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">INSS</Badge>
            )}
            {verba.incideIrrf && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">IRRF</Badge>
            )}
            {verba.incideFgts && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">FGTS</Badge>
            )}
            {verba.grupoIrrf === 'DECIMO_TERCEIRO' && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Grupo 13º</Badge>
            )}
          </div>
        </div>
      </div>
      <span className={`font-mono text-base font-semibold ${isDesconto ? 'text-desconto' : 'text-provento'}`}>
        {isDesconto ? '- ' : ''}{formatCurrency(verba.valor)}
      </span>
    </div>
  );
}

export function RescisaoResult({ resultado }: RescisaoResultProps) {
  const proventos = resultado.verbas.filter(v => v.tipo === 'provento');
  const descontos = resultado.verbas.filter(v => v.tipo === 'desconto');
  const logsManual = resultado.logs.filter(l => l.tipo === 'MANUAL');
  const logsAviso = resultado.logs.filter(l => l.tipo === 'AVISO');

  return (
    <div className="space-y-6">
      {/* Avisos e alterações manuais */}
      {(logsManual.length > 0 || logsAviso.length > 0) && (
        <Card className="card-elevated border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-amber-800 dark:text-amber-200">Atenção</p>
                {logsManual.map((log, i) => (
                  <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
                    <Badge variant="outline" className="mr-2 text-[10px]">MANUAL</Badge>
                    {log.mensagem}
                  </p>
                ))}
                {logsAviso.map((log, i) => (
                  <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
                    <Badge variant="outline" className="mr-2 text-[10px]">AVISO</Badge>
                    {log.mensagem}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-elevated border-l-4 border-l-provento">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-provento/10">
                <TrendingUp className="h-5 w-5 text-provento" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Proventos</p>
                <p className="text-xl font-bold text-provento font-mono">
                  {formatCurrency(resultado.totalProventos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-desconto">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-desconto/10">
                <ArrowDownCircle className="h-5 w-5 text-desconto" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Descontos</p>
                <p className="text-xl font-bold text-desconto font-mono">
                  {formatCurrency(resultado.totalDescontos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Líquido</p>
                <p className="text-xl font-bold text-primary font-mono">
                  {formatCurrency(resultado.liquido)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avos utilizados */}
      <Card className="card-elevated">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Avos Férias:</span>
              <span className="font-mono font-medium">{resultado.avosFeriasUtilizado}/12</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Avos 13º:</span>
              <span className="font-mono font-medium">{resultado.avos13Utilizado}/12</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhamento */}
      <Card className="card-elevated">
        <CardHeader className="header-gradient text-primary-foreground rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhamento das Verbas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Proventos */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Proventos
            </h3>
            <div className="space-y-1">
              {proventos.map((verba, index) => (
                <VerbaRow key={index} verba={verba} />
              ))}
            </div>
          </div>

          <Separator />

          {/* Descontos */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Descontos
            </h3>
            <div className="space-y-1">
              {descontos.length > 0 ? (
                descontos.map((verba, index) => (
                  <VerbaRow key={index} verba={verba} />
                ))
              ) : null}
              
              {/* INSS separado por grupo */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <ArrowDownCircle className="h-5 w-5 text-desconto" />
                  <div>
                    <p className="font-medium text-foreground">INSS Mensal</p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Grupo Mensal</Badge>
                  </div>
                </div>
                <span className="font-mono text-base font-semibold text-desconto">
                  - {formatCurrency(resultado.inssMensal)}
                </span>
              </div>

              {resultado.inss13 > 0 && (
                <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ArrowDownCircle className="h-5 w-5 text-desconto" />
                    <div>
                      <p className="font-medium text-foreground">INSS 13º</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Grupo 13º</Badge>
                    </div>
                  </div>
                  <span className="font-mono text-base font-semibold text-desconto">
                    - {formatCurrency(resultado.inss13)}
                  </span>
                </div>
              )}

              {resultado.irrfMensal > 0 && (
                <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ArrowDownCircle className="h-5 w-5 text-desconto" />
                    <div>
                      <p className="font-medium text-foreground">IRRF Mensal</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Grupo Mensal</Badge>
                    </div>
                  </div>
                  <span className="font-mono text-base font-semibold text-desconto">
                    - {formatCurrency(resultado.irrfMensal)}
                  </span>
                </div>
              )}

              {resultado.irrf13 > 0 && (
                <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ArrowDownCircle className="h-5 w-5 text-desconto" />
                    <div>
                      <p className="font-medium text-foreground">IRRF 13º</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Grupo 13º</Badge>
                    </div>
                  </div>
                  <span className="font-mono text-base font-semibold text-desconto">
                    - {formatCurrency(resultado.irrf13)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="p-6 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-primary" />
                <p className="text-lg font-semibold text-foreground">Valor Líquido a Receber</p>
              </div>
              <span className="font-mono text-2xl font-bold text-primary">
                {formatCurrency(resultado.liquido)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações adicionais */}
      {resultado.multaFgts > 0 && (
        <Card className="card-elevated bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Multa FGTS</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A multa de FGTS no valor de <span className="font-semibold text-accent">{formatCurrency(resultado.multaFgts)}</span> será
                  depositada diretamente na conta vinculada do FGTS do trabalhador.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log de cálculo */}
      {resultado.logs.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Log de Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-1 text-xs font-mono">
                {resultado.logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className={cn(
                      "shrink-0 px-1.5 py-0.5 rounded text-[10px]",
                      log.tipo === 'INFO' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                      log.tipo === 'AVISO' && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                      log.tipo === 'MANUAL' && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                    )}>
                      {log.tipo}
                    </span>
                    <span className="text-muted-foreground">{log.mensagem}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
