import { describe, expect, it } from "vitest";
import { endpoints } from "../src/observation/observation";
import { AcquisitionReport } from "../src/observation/report";

// All inputs below are synthetic, including the provenance validation cases.
const at = "2026-11-03T12:00:00.000Z";
const header = {
  schemaVersion: 1,
  kind: "windows-acquisition",
  synthetic: true,
  capturedAt: at,
};
const frame = {
  observedAt: at,
  clientState: "absent",
  accountState: "unavailable",
  requests: [{ endpoint: endpoints.live, status: 0, data: null }],
};

describe("acquisition evidence report", () => {
  it("keeps synthetic provenance, counts failures and never equates absent game with a passed check", () => {
    const report = new AcquisitionReport();
    report.add(header, 1);
    report.add(frame, 2);
    report.add(
      {
        ...frame,
        observedAt: "2026-11-03T12:00:02.000Z",
        clientState: "available",
        accountState: "identified",
        requests: [
          { endpoint: endpoints.phase, status: 200, data: "None" },
          { endpoint: endpoints.live, status: 0, data: null },
        ],
      },
      3,
    );
    const text = report.markdown();
    expect(text).toContain("SYNTHETIC INPUT");
    expect(text).toContain("Completed frames: 2");
    expect(text).toContain(
      `| 3 | 2026-11-03T12:00:02.000Z | available / identified |`,
    );
    expect(text).toContain(`| \`${endpoints.live}\` | 0: 2 |`);
    expect(text).toContain("Sources in the host");
    expect(text).toContain("Manual evidence still required");
  });

  it("inventories successful shapes without claiming ranks, roster readiness or host verification", () => {
    const report = new AcquisitionReport();
    report.add({ ...header, synthetic: false }, 1);
    report.add(
      {
        ...frame,
        requests: [
          { endpoint: endpoints.ranked, status: 503, data: { queues: [] } },
          { endpoint: endpoints.ranked, status: 200, data: { queueMap: {} } },
          {
            endpoint: endpoints.session,
            status: 200,
            data: { gameData: { queue: { id: 420 } } },
          },
        ],
      },
      2,
    );
    const text = report.markdown();
    expect(text).toContain("PARTIAL");
    expect(text).toContain("public Fluxta checks still pending");
    expect(text).toContain("Observed queue ids: 420");
    expect(text).toContain(
      "Successful ranked response shapes: queueMap object",
    );
    expect(text).not.toContain("queues array");
    expect(text).toContain("first complete roster");
  });

  it("never copies identities, raw errors or unexpected lifecycle data into the summary", () => {
    const report = new AcquisitionReport();
    report.add({ ...header, note: "private-header-value" }, 1);
    report.add(
      {
        ...frame,
        accountId: "private-puuid",
        requests: [
          { endpoint: endpoints.phase, status: 200, data: "private-token" },
          {
            endpoint: endpoints.account,
            status: 200,
            data: { puuid: "private-puuid", gameName: "private-player" },
          },
          {
            endpoint: endpoints.live,
            status: 0,
            data: { error: "private-error" },
          },
        ],
      },
      2,
    );
    const text = report.markdown();
    expect(text).not.toContain("private-");
    expect(text).toContain("other/unknown");
  });

  it("refuses unrelated diagnostics, corrupt frames, unknown endpoints and reversed timestamps", () => {
    expect(() => new AcquisitionReport().markdown()).toThrow();
    expect(() =>
      new AcquisitionReport().add({ client: "absent" }, 1),
    ).toThrow();
    const report = new AcquisitionReport();
    report.add(header, 1);
    expect(() =>
      report.add({ ...frame, clientState: "private-state" }, 2),
    ).toThrow();
    expect(() =>
      report.add({ ...frame, observedAt: "private-time" }, 2),
    ).toThrow();
    report.add(frame, 2);
    expect(() =>
      report.add({ ...frame, observedAt: "2026-11-03T11:59:00.000Z" }, 3),
    ).toThrow();
    expect(() =>
      report.add(
        {
          ...frame,
          requests: [{ endpoint: "/private-endpoint", status: 200 }],
        },
        3,
      ),
    ).toThrow();
  });
});
