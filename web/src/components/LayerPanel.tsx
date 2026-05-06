import { GROUPS, LAYERS, type LayerDef, type LayerGroup } from "../layers";

interface Props {
  selected: Set<string>;
  toggle: (id: string) => void;
}

const GROUP_ICON: Record<LayerGroup, string> = {
  "Composite":              "fa-solid fa-chart-line",
  "Hazard factors":         "fa-solid fa-water",
  "Vulnerability factors":  "fa-solid fa-people-group",
};

export function LayerPanel(p: Props) {
  return (
    <aside className="panel">
      <section>
        <h3><i className="fa-solid fa-layer-group" /> Layers</h3>
        {GROUPS.map((g) => (
          <details key={g} open={g === "Composite"} className="group">
            <summary>
              <i className={GROUP_ICON[g]} />
              <strong>{g}</strong>
              <span className="group-count">
                {LAYERS.filter((l) => l.group === g).length}
              </span>
            </summary>
            <div className="group-body">
              {LAYERS.filter((l) => l.group === g).map((l: LayerDef) => (
                <label key={l.id} className="row layer-row" title={l.blurb}>
                  <input
                    type="checkbox"
                    checked={p.selected.has(l.id)}
                    onChange={() => p.toggle(l.id)}
                  />
                  <span>{l.name}</span>
                </label>
              ))}
            </div>
          </details>
        ))}
      </section>
    </aside>
  );
}
