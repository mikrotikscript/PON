export type PonClass = 'B+' | 'C+';
export type SplitterRatio = '1:2' | '1:4' | '1:8' | '1:16' | '1:32' | '1:64';

export const PON_PROFILES = {
  'B+': { txMin: 1.5, txMax: 5, rxSensitivity: -27, rxOverload: -8 },
  'C+': { txMin: 3, txMax: 7, rxSensitivity: -30, rxOverload: -8 },
} as const;

// Typical component insertion-loss planning values. Replace with datasheet/test values
// for the exact part installed in the field.
export const SPLITTER_TYPICAL_LOSS: Record<SplitterRatio, number> = {
  '1:2': 3.7, '1:4': 7.2, '1:8': 10.5, '1:16': 13.7, '1:32': 17.1, '1:64': 20.5,
};

export type CalculationInput = {
  ponClass: PonClass;
  txPower: number;
  fiberLengthKm: number;
  fiberAttenuation: number;
  spliceCount: number;
  spliceLoss: number;
  connectorCount: number;
  connectorLoss: number;
  splitterRatio: SplitterRatio;
  splitterLoss: number;
  otherLoss: number;
  engineeringMargin: number;
};

export type CalculationResult = {
  fiberLoss: number;
  spliceTotal: number;
  connectorTotal: number;
  passiveLoss: number;
  designLoss: number;
  predictedRx: number;
  marginToSensitivity: number;
  marginToOverload: number;
  status: 'PASS' | 'MARGINAL' | 'FAIL';
  reasons: string[];
};

export function calculateLink(input: CalculationInput): CalculationResult {
  const profile = PON_PROFILES[input.ponClass];
  const fiberLoss = input.fiberLengthKm * input.fiberAttenuation;
  const spliceTotal = input.spliceCount * input.spliceLoss;
  const connectorTotal = input.connectorCount * input.connectorLoss;
  const passiveLoss = fiberLoss + spliceTotal + connectorTotal + input.splitterLoss + input.otherLoss;
  const designLoss = passiveLoss + input.engineeringMargin;
  const predictedRx = input.txPower - designLoss;
  const marginToSensitivity = predictedRx - profile.rxSensitivity;
  const marginToOverload = profile.rxOverload - predictedRx;
  const reasons: string[] = [];

  if (input.txPower < profile.txMin || input.txPower > profile.txMax) {
    reasons.push(`Tx OLT ${input.txPower.toFixed(2)} dBm berada di luar rentang profil ${input.ponClass} (${profile.txMin} sampai ${profile.txMax} dBm).`);
  }
  if (predictedRx < profile.rxSensitivity) {
    reasons.push(`Prediksi Rx ${predictedRx.toFixed(2)} dBm lebih rendah dari sensitivitas ${profile.rxSensitivity} dBm.`);
  }
  if (predictedRx > profile.rxOverload) {
    reasons.push(`Prediksi Rx ${predictedRx.toFixed(2)} dBm melewati batas overload ${profile.rxOverload} dBm.`);
  }

  const status = reasons.length ? 'FAIL' :
    (marginToSensitivity < 3 || marginToOverload < 3 ? 'MARGINAL' : 'PASS');

  return { fiberLoss, spliceTotal, connectorTotal, passiveLoss, designLoss, predictedRx,
    marginToSensitivity, marginToOverload, status, reasons };
}
