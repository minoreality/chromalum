// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../i18n";
import { TheoryPanel } from "../TheoryPanel";

function renderWithLanguage(language: "ja" | "en" = "en") {
  localStorage.setItem("chromalum_lang", language);
  return render(
    <LanguageProvider>
      <TheoryPanel />
    </LanguageProvider>,
  );
}

describe("TheoryPanel", () => {
  it.each(["ja", "en"] as const)("keeps %s mathematical prose separate from worked examples and control instructions", (language) => {
    const { container } = renderWithLanguage(language);
    const paragraphs = Array.from(container.querySelectorAll(".theory-desc"));
    const prose = paragraphs.map((paragraph) => paragraph.textContent ?? "").join("\n");

    expect(prose).not.toMatch(
      /例えば|たとえば|for example|ボタン|ホバー|クリック|下図|下の表|\b(?:click|press)\b|the (?:table|diagram) below/i,
    );
    expect(prose).toContain("¬(∨ᵢaᵢ)=∧ᵢ¬aᵢ");
    expect(prose).toContain("e_c∧e_d=K");
    expect(prose).toContain("T1=t⊕T0");
    expect(paragraphs.every((paragraph) => !paragraph.textContent?.includes("\n\n"))).toBe(true);
    const mixingHint = container.querySelector("#theory-mixing .theory-mixing-hint");
    expect(mixingHint?.textContent).toContain("[G,R,B]");
    expect(mixingHint?.closest(".theory-desc")).toBeNull();
    expect(container.querySelector(".theory-binary-key")?.textContent).toContain("H(7,4)");
    const introduction = Array.from(container.querySelectorAll(".theory-intro"))
      .map((node) => node.textContent)
      .join("\n");
    expect(introduction).not.toContain("A=𝒫(E)");
    expect(container.querySelector("#theory-algebra")?.textContent).toContain("A=𝒫(E)");
    expect(container.querySelector("#theory-algebra")?.textContent).not.toMatch(/Boolean|ブール|原子|XOR|⊕|reduct/);
    expect(container.querySelector("#theory-boolean-operations aside")?.textContent).toContain("e_c∧e_d=K");
  });

  it("derives named ranks with a prose subset-sum supplement and keeps the other panels distinct", () => {
    const { container } = renderWithLanguage();
    const derivation = container.querySelector("#theory-rank")!;
    expect(derivation.querySelectorAll("#theory-rank-order figure")).toHaveLength(1);
    expect(Array.from(derivation.querySelectorAll(".theory-derivation-comparisons code"), (node) => node.textContent)).toEqual([
      "wB > 0",
      "wR > wB",
      "wG > wR + wB",
    ]);
    expect(
      Array.from(derivation.querySelectorAll(".theory-derivation-order-colors li"), (node) =>
        Array.from(node.children, (part) => part.textContent),
      ),
    ).toEqual([
      ["{}", "K", "0"],
      ["{B}", "B", "1"],
      ["{R}", "R", "2"],
      ["{R,B}", "M", "3"],
      ["{G}", "G", "4"],
      ["{G,B}", "C", "5"],
      ["{G,R}", "Y", "6"],
      ["{G,R,B}", "W", "7"],
    ]);
    expect(Array.from(derivation.querySelectorAll(".theory-derivation-named-ranks span"), (node) => node.textContent)).toEqual([
      "B=1",
      "R=2",
      "G=4",
    ]);
    const order = derivation.querySelector(".theory-derivation-order")!;
    const conclusion = derivation.querySelector(".theory-derivation-conclusion")!;
    expect(order.compareDocumentPosition(conclusion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const proof = conclusion.querySelector(".theory-derivation-proof")!;
    expect(proof.textContent).toContain("0–7 without repetition or gaps");
    expect(proof.querySelectorAll("ol li")).toHaveLength(3);
    const states = order.querySelector(".theory-derivation-order-colors")!;
    const rankDefinition = order.querySelector(".theory-derivation-rank-definition")!;
    const namedRanks = conclusion.querySelector(".theory-derivation-named-ranks")!;
    const bitsNote = conclusion.querySelector(".theory-derivation-bits-note")!;
    const rankFormula = conclusion.querySelector("code:last-of-type")!;
    expect(states.compareDocumentPosition(rankDefinition) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rankDefinition.textContent).toContain("zero-based rank L");
    expect(rankDefinition.compareDocumentPosition(namedRanks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(order.querySelector(".theory-desc")?.textContent).toContain("necessary and sufficient");
    expect(conclusion.firstElementChild?.textContent).toContain("ranks of the primaries themselves");
    expect(namedRanks.compareDocumentPosition(proof) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(namedRanks.compareDocumentPosition(bitsNote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bitsNote.textContent).toContain("three bits (g,r,b)");
    expect(bitsNote.compareDocumentPosition(rankFormula) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(conclusion.querySelector("p.theory-derivation-supplement")?.textContent).toContain("original score σ are not fixed at 1,2,4");
    expect(derivation.textContent).toContain("L(S)=#{T∈A | σ(T)<σ(S)}");
    expect(order.textContent).not.toContain("T=L/7");
    expect(conclusion.textContent).toContain("L(g,r,b)=4g+2r+b");
    expect(conclusion.textContent).not.toContain("T=L/7");
    expect(derivation.querySelector(".theory-derivation-conclusion")?.textContent).toContain("L(g,r,b)=4g+2r+b");
    const cube = screen.getByRole("group", { name: "Color Cube" });
    expect(cube.closest(".theory-chapter")?.id).toBe("theory-cube-cycle");
    expect(screen.queryByRole("group", { name: "Primary bit to toggle" })).toBeNull();
    const cycle = screen.getByRole("group", { name: "Chromatic One-Bit Six-Cycle" });
    expect(cycle.closest("section")?.id).toBe("theory-geometry");
    expect(cycle.closest(".theory-hue")?.querySelector(".theory-zigzag-svg")).not.toBeNull();
    expect(screen.getAllByTestId("hamming-parity-check-card")).toHaveLength(1);
    expect(screen.getByTestId("hamming-parity-sets").closest('[data-testid="hamming-flow-operation-check"]')).not.toBeNull();
  });
  it("renders conceptual chapters followed by the correspondence table and keeps the toggle table in the action chapter", () => {
    const { container } = renderWithLanguage();

    expect(screen.getByText("Discrete Algebraic Color Theory")).toBeTruthy();
    expect(Array.from(container.querySelectorAll(".theory-heading")).map((heading) => heading.textContent)).toEqual([
      "Three Primaries and Eight States",
      "Total Order and Binary Weights",
      "Duality of Mixing and Complement",
      "Toggle Action and Distance Structure",
      "Geometry and Codes of Nonzero Vectors",
      "Hue Order and Polyhedral Duality",
      "Continuous Extension of the Chromatic Six-Cycle",
      "Conclusion and Scope",
      "Eight-State Correspondence Table",
    ]);
    expect(Array.from(container.querySelectorAll("h4")).map((heading) => heading.textContent)).toEqual([
      "Subsets and Three Bits",
      "Total Order and Rank",
      "Deriving Primary Numbers",
      "Color Cube",
      "Partitioning K₈ Edges by Hamming Distance",
      "Fano Plane",
      "Hamming [7,4,3] Code",
      "Face Arrangement of the Color Die",
      "The Dual Octahedron",
    ]);
    expect(container.querySelectorAll("h5, h6")).toHaveLength(0);
    const chapters = Array.from(container.querySelectorAll(".theory-chapter"));
    expect(chapters.map((chapter) => chapter.id)).toEqual([
      "theory-algebra",
      "theory-rank",
      "theory-boolean-operations",
      "theory-cube-cycle",
      "theory-fano-hamming",
      "theory-polyhedra",
      "theory-geometry",
      "theory-scope",
      "theory-reference",
    ]);
    expect(container.querySelector("#theory-k8")?.parentElement?.id).toBe("theory-cube-cycle");
    expect(container.querySelector("#theory-toggle-table")?.closest(".theory-chapter")?.id).toBe("theory-cube-cycle");
    expect(container.querySelector("#theory-toggle-appendix")).toBeNull();

    const rankChapter = container.querySelector("#theory-rank")!;
    const rankSections = Array.from(rankChapter.querySelectorAll(":scope > .theory-subsection"));
    expect(rankSections.map((section) => section.id)).toEqual(["theory-rank-order", "theory-rank-derivation"]);
    const rankIntro = rankChapter.querySelector(":scope > .theory-desc")!;
    expect(rankIntro.textContent).toContain("power set 𝒫(E)");
    expect(rankIntro.compareDocumentPosition(rankSections[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rankSections[0].querySelector(".theory-derivation-rank-definition")).not.toBeNull();
    expect(rankSections[1].querySelector(".theory-derivation-proof")).not.toBeNull();
    expect(rankSections[1].textContent).toContain("L(g,r,b)=4g+2r+b");
    expect(rankSections[1].textContent).not.toContain("T=L/7");
    expect(rankSections[1].querySelector(":scope > .theory-desc")?.textContent).toContain("primary count |S|=g+r+b");
    const reference = screen.getByRole("group", { name: "Eight-State Correspondence Table" }).closest("section");
    expect(reference?.id).toBe("theory-reference");
    expect(chapters[chapters.length - 1]).toBe(reference);
    expect(rankSections[1].textContent).toContain("a⊊b ⇒ L(a)<L(b)");
    const complement = screen.getByTestId("complement-ranks");
    const identities = screen.getByTestId("rank-identities");
    expect(complement.querySelectorAll(".theory-valuation-complement-formulas code")).toHaveLength(1);
    expect(complement.textContent).toContain("L(a)+L(¬a)=7");
    expect(complement.textContent).not.toContain("L(¬a)=7−L(a)");
    expect(container.querySelector("#theory-cube-cycle > .theory-desc")?.textContent).toContain("L(¬a)=7−L(a)");
    expect(complement.closest(".theory-chapter")?.id).toBe("theory-boolean-operations");
    expect(complement.previousElementSibling?.textContent).toContain("The complement of a state");
    expect(identities.closest(".theory-chapter")?.id).toBe("theory-boolean-operations");
    expect(identities.previousElementSibling?.textContent).toContain("These conditional equalities");
    expect(container.querySelector("#theory-rank-operations")).toBeNull();
    expect(rankChapter.querySelector(".theory-diagram-label")).toBeNull();

    const text = container.textContent ?? "";
    expect(text).toContain("A=𝒫(E)");
    expect(text).toContain("(A,⊕)≅(𝔽₂³,+)");
    expect(text).toContain("Γ(S)=∨");
    expect(text).toContain("weights whose eight subset sums reproduce 0–7 must be 1,2,4");
    expect(text).toContain("wG > wR + wB");
    expect(text).toContain("L(g,r,b)=4g+2r+b");
    expect(text).toContain("L(a∨b)+L(a∧b)=L(a)+L(b)");
    expect(text).toContain("L(a⊕b)=L(a)+L(b)−2L(a∧b)");
    expect(text).toContain("L(¬a)=7−L(a)");
    expect(text).toContain("κ(a)=¬a=a⊕W");
    expect(text).toContain("Hxᵀ=h_i⊕h_j⊕h_k");
    expect(text).toContain("rank H=3");
    expect(text).toContain("dim ker H=7−3=4");
    expect(text).toContain("Hamming [7,4,3]");
    expect(text).toContain("8·C(3,d)/2");
    expect(text).toContain("T0=ker π={K,M,C,Y}");
    expect(text).toContain("T1={x∈A | π(x)=1}={B,R,G,W}");
    expect(text).toContain("T(h)=λ(γ(h))/7");
    expect(text).toContain("T(h+1/2)=1−T(h)");
    expect(text).toContain("T=1/2");
    expect(text).toContain("L(κ(c))=7−L(c)");

    for (const retained of [
      "Venn Diagram",
      "Additive and Subtractive Color Mixing",
      "Color Cube",
      "C-cycle",
      "Fano Plane",
      "Hamming [7,4,3] Code",
      "Tone Zigzag and Hue-Edge Differences",
      "Hue-Order Net of the Color Die",
      "Color Diamond",
    ]) {
      expect(screen.getAllByText(retained).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("group", { name: "Eight-State Correspondence Table" })).toBeTruthy();
    expect(screen.getByRole("figure", { name: "GRB Logical OR" }).closest(".theory-chapter")?.id).toBe("theory-boolean-operations");
    expect(screen.getByRole("figure", { name: "MCY Logical AND" }).closest("details")).toBeNull();

    for (const omitted of ["Polyhedra network", "Octahedral Faces and Operations"]) {
      expect(screen.queryByText(omitted)).toBeNull();
    }
    expect(text).toContain("cube is a chosen model");
    expect(text).toContain("preserving the five connections in hue order");
    for (const excluded of ["pitch", "absolute frequency", "OKLab", "[8,4,4]", "1981", "11 free cube nets"]) {
      expect(text).not.toContain(excluded);
    }
  });

  it("keeps essential explanations as visible prose without introducing subsection cards", () => {
    const { container } = renderWithLanguage();
    const rankSection = container.querySelector<HTMLElement>("#theory-rank");
    const structuresSection = container.querySelector<HTMLElement>("#theory-fano-hamming");
    const geometrySection = container.querySelector<HTMLElement>("#theory-polyhedra");

    expect(rankSection).not.toBeNull();
    expect(structuresSection).not.toBeNull();
    expect(geometrySection).not.toBeNull();

    expect(within(rankSection!).queryByRole("heading", { name: "Rank and Primary Count" })).toBeNull();
    expect(within(rankSection!).queryByRole("heading", { name: "Eight-State Correspondence Table" })).toBeNull();
    expect(within(structuresSection!).queryByRole("heading", { name: "Seven Nonzero Toggle Patterns" })).toBeNull();
    expect(container.querySelector("#theory-geometry")?.querySelectorAll("h4")).toHaveLength(0);
    const dieSection = within(geometrySection!).getByRole("region", { name: "Face Arrangement of the Color Die" });
    const dieHeading = within(dieSection).getByRole("heading", { level: 4, name: "Face Arrangement of the Color Die" });
    const octaSection = within(geometrySection!).getByRole("region", { name: "The Dual Octahedron" });
    const octaHeading = within(octaSection).getByRole("heading", {
      level: 4,
      name: "The Dual Octahedron",
    });
    expect(rankSection!.textContent).toContain("The primary count |S|=g+r+b");
    expect(dieSection.parentElement).toBe(geometrySection);
    expect(dieHeading.parentElement).toBe(dieSection);
    const net = within(dieSection).getByTestId("hue-order-net");
    const ranks = within(dieSection).getByTestId("color-die-rank-structure");
    expect(net.compareDocumentPosition(ranks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dieSection.querySelector("details")).toBeNull();
    expect(dieSection.textContent).not.toMatch(/mixing|XNOR|\bjoin\b|\bmeet\b/i);
    expect(screen.queryByTestId("color-die-view-grid")).toBeNull();
    expect(octaSection.parentElement).toBe(geometrySection);
    expect(octaHeading.parentElement).toBe(octaSection);
    expect(octaSection.querySelectorAll("svg")).toHaveLength(1);
    expect(octaSection.querySelector("[data-die-vertex], [data-die-face]")).toBeNull();

    const rankParagraphs = Array.from(rankSection!.querySelectorAll("p.theory-desc"));
    const structureParagraphs = Array.from(structuresSection!.querySelectorAll("p.theory-desc"));
    expect(rankParagraphs.some((node) => node.textContent?.includes("|S|"))).toBe(true);
    expect(rankParagraphs.some((node) => node.textContent?.includes("π=wt mod 2"))).toBe(false);
    expect(container.querySelector("#theory-boolean-operations")?.textContent).not.toContain("π=wt mod 2=g⊕r⊕b");
    expect(container.querySelector("#theory-k8")?.textContent).toContain("π=wt mod 2=g⊕r⊕b");
    expect(container.querySelector("#theory-reference .theory-binary-key")?.textContent).toContain(
      "P = parity coordinate · D = data coordinate",
    );
    expect(structureParagraphs.some((node) => node.textContent?.includes("ev_K(τ_m)=τ_m(K)=m"))).toBe(true);
    expect(structureParagraphs.some((node) => node.textContent?.includes("Hxᵀ=h_i⊕h_j⊕h_k"))).toBe(true);
  });

  it("keeps the action definitions before distance and places the linked Cayley table below the K8 graph", () => {
    renderWithLanguage();

    const faceSection = screen.getByRole("heading", { name: "Partitioning K₈ Edges by Hamming Distance" }).closest("section")!;
    const faceNote = screen.getByText(/The three vertices a,b,c of a face therefore recover/);
    const distanceDiagram = faceSection.querySelector("#theory-stella-view")!;
    expect(distanceDiagram.compareDocumentPosition(faceNote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(faceSection.textContent).toContain("¬T0=T1");
    expect(faceSection.textContent).toContain("¬T1=T0");
    expect(faceSection.querySelector("details")).toBeNull();
    expect(faceNote.textContent).toContain("d=a⊕b⊕c");
    expect(faceNote.textContent).not.toMatch(/For example|010⊕100⊕111=001=B/);
    expect(faceSection.querySelectorAll("svg")).toHaveLength(1);
    expect(faceSection.querySelector('[data-testid="tetra-face-duality"]')).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Select a face" })).toBeNull();
    expect(faceSection.textContent).not.toMatch(/majority|centroid/i);

    const action = screen.getByRole("heading", { name: "Toggle Action and Distance Structure" }).closest("section")!;
    const table = screen.getByText("Complete Toggle-Action Table").closest("figure")!;
    const uniqueMask = within(action).getByText(/^For any two states x,y/);
    const distance = within(action).getByText(/^The unique toggle mask connecting two states/);
    expect(table.closest("details")).toBeNull();
    expect(table.closest("section")).toBe(faceSection);
    expect(table.querySelectorAll("td button")).toHaveLength(64);
    expect(uniqueMask.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(distance.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(distanceDiagram.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(faceSection.querySelectorAll('[data-testid="toggle-action-readout"]')).toHaveLength(1);
    expect(faceSection.querySelectorAll(".theory-k8-comparison")).toHaveLength(1);
    expect(distance.compareDocumentPosition(action.querySelector("#theory-cube")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(distance.previousElementSibling?.textContent).toContain("Hamming weight");
    expect(action.textContent).toContain("(1−2x_c)L({c})");
    expect(action.textContent).not.toContain("±w_c");
    const cube = action.querySelector(".theory-cube")!;
    const faces = within(action).getByText(/^Each face fixes one bit/);
    expect(cube.compareDocumentPosition(faces) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const hamming = screen.getByRole("heading", { name: "Hamming [7,4,3] Code" }).closest("section")!;
    const flow = hamming.querySelector(".theory-hamming-flow")!;
    const proof = within(hamming).getByText(/^For a word x supported/);
    const columns = within(hamming).getByText(/^Arrange the seven nonzero three-bit vectors/);
    expect(columns.compareDocumentPosition(flow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(flow.compareDocumentPosition(proof) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps color names and bit parity in the responsive binary table", () => {
    renderWithLanguage();

    const binaryTable = screen.getByRole("group", { name: "Eight-State Correspondence Table" });

    const textNodes = Array.from(binaryTable.querySelectorAll("text"));
    const headers = Array.from(binaryTable.children)
      .filter((node) => node.tagName === "text")
      .sort((a, b) => parseFloat(a.getAttribute("x")!) - parseFloat(b.getAttribute("x")!));
    expect(headers.map((node) => node.textContent)).toEqual([
      "Lv",
      "GRB",
      "Color",
      "Name",
      "S",
      "G",
      "R",
      "B",
      "Wt",
      "π",
      "H(7,4)",
      "Tone",
    ]);
    const rows = Array.from(binaryTable.children).filter((node) => node.tagName === "g");
    const valuesFor = (header: string) => {
      const x = headers.find((node) => node.textContent === header)!.getAttribute("x");
      return rows.map((row) => row.querySelector(`text[x="${x}"]`)?.textContent);
    };
    expect(valuesFor("Name")).toEqual(["K", "B", "R", "M", "G", "C", "Y", "W"]);
    expect(valuesFor("π").join("")).toBe("01101001");
    expect(valuesFor("Lv")).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
    expect(textNodes.filter((node) => /^[0-7]\/7$/.test(node.textContent ?? "")).map((node) => node.textContent)).toEqual([
      "0/7",
      "1/7",
      "2/7",
      "3/7",
      "4/7",
      "5/7",
      "6/7",
      "7/7",
    ]);
  });

  it("clears pinned highlights when clicking the full-width background surface", async () => {
    const { container } = renderWithLanguage();

    const venn = screen.getByRole("img", { name: "Venn Diagram" });
    await act(async () => {
      fireEvent.click(venn);
      await Promise.resolve();
    });
    await waitFor(() => expect(venn.getAttribute("data-highlighted-level")).toBe("0"));

    const resetSurface = container.querySelector(".theory-reset-surface");
    expect(resetSurface).toBeTruthy();
    await act(async () => {
      fireEvent.click(resetSurface!);
      await Promise.resolve();
    });
    await waitFor(() => expect(venn.getAttribute("data-highlighted-level")).toBeNull());
  });

  it("clears pinned highlights from Escape regardless of focus", async () => {
    renderWithLanguage();

    const venn = screen.getByRole("img", { name: "Venn Diagram" });
    await act(async () => {
      fireEvent.click(venn);
      await Promise.resolve();
    });
    await waitFor(() => expect(venn.getAttribute("data-highlighted-level")).toBe("0"));

    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Escape" });
      await Promise.resolve();
    });
    await waitFor(() => expect(venn.getAttribute("data-highlighted-level")).toBeNull());
  });

  it("keeps the K8 distance partition explorable through the retained stella", () => {
    renderWithLanguage();

    const section = screen.getByRole("heading", { name: "Partitioning K₈ Edges by Hamming Distance" }).closest("section");
    expect(section).toBeTruthy();
    expect(section!.querySelectorAll("h3, h4")).toHaveLength(1);
    expect(section!.textContent).toContain("The distance-2 subgraph splits according to bit parity");
    expect(within(section!).getByRole("group", { name: "Hamming distance graph of the eight states" })).toBeTruthy();
    const buttons = Array.from(
      screen.getByRole("group", { name: "Select visible distances (multiple allowed)" }).querySelectorAll("button"),
    );
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Nodes only",
      "Distance 1 · 12 edges",
      "Distance 2 · 12 edges",
      "Distance 3 · 4 edges",
    ]);
    const distanceOne = screen.getByRole("button", { name: "Distance 1 · 12 edges" });
    const distanceThree = screen.getByRole("button", { name: "Distance 3 · 4 edges" });
    expect(section!.textContent).toContain("Q₃(12)");
    expect(section!.textContent).toContain("2K₄(12)");
    expect(buttons.slice(1).every((button) => button.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(section!.querySelectorAll("[data-k8-edge]")).toHaveLength(28);

    const distanceTwo = screen.getByRole("button", { name: "Distance 2 · 12 edges" });
    fireEvent.click(distanceOne);
    fireEvent.click(distanceThree);
    expect(distanceTwo.getAttribute("aria-pressed")).toBe("true");
    expect(section!.querySelectorAll('[data-k8-distance="2"]')).toHaveLength(12);
    expect(section!.querySelectorAll("polygon, path")).toHaveLength(0);
  });
});
