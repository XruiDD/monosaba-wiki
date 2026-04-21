export default function TweaksPanel({ tweaks, update }) {
  return (
    <div className="tweaks-panel open">
      <h4>Tweaks</h4>
      <span className="tweak-label">视觉方向</span>
      <div className="variant-picker">
        {[
          {id: "gothic",  label: "暗黑哥特"},
          {id: "monitor", label: "冷峻监控"},
          {id: "paper",   label: "卷纸手抄"},
        ].map((v) => (
          <div key={v.id}
            className={`variant-opt ${tweaks.variant === v.id ? "active" : ""}`}
            onClick={() => update({ variant: v.id })}>
            {v.label}
          </div>
        ))}
      </div>

      <span className="tweak-label mt-16" style={{marginTop: 14, display: "block"}}>密度</span>
      <div className="variant-picker" style={{gridTemplateColumns: "1fr 1fr"}}>
        {[
          {id: "comfortable", label: "舒适"},
          {id: "compact",     label: "紧凑"},
        ].map((v) => (
          <div key={v.id}
            className={`variant-opt ${tweaks.density === v.id ? "active" : ""}`}
            onClick={() => update({ density: v.id })}>
            {v.label}
          </div>
        ))}
      </div>

      <span className="tweak-label mt-16" style={{marginTop: 14, display: "block"}}>典狱长引言</span>
      <div className="variant-picker" style={{gridTemplateColumns: "1fr 1fr"}}>
        {[
          {id: true,  label: "显示"},
          {id: false, label: "隐藏"},
        ].map((v) => (
          <div key={String(v.id)}
            className={`variant-opt ${tweaks.showWardenQuotes === v.id ? "active" : ""}`}
            onClick={() => update({ showWardenQuotes: v.id })}>
            {v.label}
          </div>
        ))}
      </div>
    </div>
  );
}
