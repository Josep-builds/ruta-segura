import { describe, expect, it } from "vitest";
import { generateLabeledEvents } from "@/lib/telemetry/simulator";
import { classifyEvent } from "./engine";
import { runFusionReport } from "./report";

describe("motor de fusión vs. umbral ingenuo (0.4g solo acelerómetro)", () => {
  const events = generateLabeledEvents(52, 42);
  const report = runFusionReport(events);

  it("corre sobre al menos 50 eventos etiquetados", () => {
    expect(events.length).toBeGreaterThanOrEqual(50);
  });

  it("ningún evento queda sin loguear", () => {
    expect(report.rows.length).toBe(events.length);
  });

  it("documenta la tasa real de falsos positivos de ambos clasificadores", () => {
    // No prometemos "resuelto": solo medimos y logueamos el número real.
    console.log(
      `\nFalsos positivos — ingenuo: ${(report.naiveFalsePositiveRate * 100).toFixed(1)}% ` +
        `(${report.naiveFalsePositives}/${report.nonCaidaTotal}) | ` +
        `fusión: ${(report.fusionFalsePositiveRate * 100).toFixed(1)}% ` +
        `(${report.fusionFalsePositives}/${report.nonCaidaTotal})\n`
    );

    expect(report.naiveFalsePositiveRate).toBeGreaterThan(0);
    expect(report.fusionFalsePositiveRate).toBeLessThan(
      report.naiveFalsePositiveRate
    );
  });

  it("no pierde caídas reales: frenado_real siempre se clasifica como posible_caida", () => {
    const caidas = events.filter((e) => e.category === "frenado_real");
    const detectadas = caidas.filter(
      (e) => classifyEvent(e).clasificacion === "posible_caida"
    );
    expect(detectadas.length).toBe(caidas.length);
  });
});
