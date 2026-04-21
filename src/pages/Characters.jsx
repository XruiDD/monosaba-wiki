import { useEffect, useState } from "react";
import { ACC_DATA, COMBO_DATA, TEAM } from "../data/accessories.js";

export default function CharactersPage({ focus }) {
  const [selected, setSelected] = useState(ACC_DATA[0]);

  useEffect(() => {
    if (!focus) return;
    const acc = ACC_DATA.find((a) => a.slug === focus);
    if (acc) {
      setSelected(acc);
      // 滚到左列对应头像
      setTimeout(() => {
        const el = document.querySelector(`[data-acc-slug="${focus}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
  }, [focus]);

  const relatedCombos = COMBO_DATA.filter((c) => c.members.includes(selected.slug));

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 叁 · ACCESSORIES</div>
        <h1 className="page-title">饰品图鉴</h1>
        <p className="page-dek">
          十六件以原作角色命名的饰品，按队别以颜色区分。探索得到的饰品放入背包对应颜色的『饰品栏』即可生效，
          多件组合会解锁联动效果。
        </p>
        <div className="warden-quote">「颜色不骗人——骗你的是戴着它的那位。」— 典狱长</div>
      </div>

      <div className="char-layout">
        <div className="char-roster">
          <div className="char-portraits acc-portraits">
            {ACC_DATA.map((a) => (
              <button key={a.slug}
                data-acc-slug={a.slug}
                className={`char-portrait team-${a.team} ${selected.slug === a.slug ? "active" : ""}`}
                style={{ "--team-color": TEAM[a.team] }}
                onClick={() => setSelected(a)}
                title={a.name}>
                <img src={`assets/characters/${a.img}`} className="pixel" alt=""/>
                <span className="cp-name">{a.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="char-detail">
          <AccessoryDetail a={selected} relatedCombos={relatedCombos}/>
        </div>
      </div>

      <div className="divider">饰品联动总表</div>
      <CombosTable selected={selected} setSelected={setSelected}/>
    </div>
  );
}

function AccessoryDetail({ a, relatedCombos }) {
  return (
    <div className="char-card card" style={{ "--team-color": TEAM[a.team] }}>
      <div className="corner tl"/><div className="corner tr"/>
      <div className="corner bl"/><div className="corner br"/>

      <div className="cd-head">
        <div className="cd-portrait">
          <img src={`assets/characters/${a.img}`} className="pixel" alt=""/>
        </div>
        <div style={{flex: 1}}>
          <div className="page-kicker" style={{ color: TEAM[a.team] }}>
            FILE # {a.slug.toUpperCase()}
          </div>
          <h2 className="cd-name serif">{a.name}</h2>
          <span className="acc-dot lg" style={{background: TEAM[a.team]}}/>
        </div>
      </div>

      <div className="divider">饰品效果</div>
      <p className="cd-desc serif">{a.effect}</p>

      {relatedCombos.length > 0 && (
        <>
          <div className="divider">联动</div>
          <div className="acc-combos-inline">
            {relatedCombos.map((c, i) => (
              <div key={i} className={`combo-pill tier-${c.tier}`}>
                <div className="combo-members">
                  {c.members.map((m) => {
                    const ac = ACC_DATA.find((x) => x.slug === m);
                    if (!ac) return null;
                    return (
                      <span key={m} className="combo-dot" style={{borderColor: TEAM[ac.team]}}>
                        <img src={`assets/characters/${ac.img}`} className="pixel" alt=""/>
                      </span>
                    );
                  })}
                </div>
                <div className="combo-body">
                  <div className="combo-name serif">{c.name}</div>
                  <div className="combo-effect muted">{c.effect}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CombosTable({ selected, setSelected }) {
  const tiers = [
    { id: "main",   label: "主联动"   },
    { id: "minor",  label: "二件套"   },
    { id: "easter", label: "彩蛋成就" },
  ];
  return (
    <div className="combos-wrap">
      {tiers.map((t) => (
        <div key={t.id}>
          <div className="combo-tier-label mono">—— {t.label} · {t.id.toUpperCase()}</div>
          <div className="combos-grid">
            {COMBO_DATA.filter((c) => c.tier === t.id).map((c, i) => (
              <div key={i} className={`card combo-card ${selected && c.members.includes(selected.slug) ? "hl" : ""}`}>
                <div className="corner tl"/><div className="corner tr"/>
                <div className="corner bl"/><div className="corner br"/>
                <div className="combo-members lg">
                  {c.members.map((m) => {
                    const ac = ACC_DATA.find((x) => x.slug === m);
                    if (!ac) return null;
                    return (
                      <button key={m} className="combo-dot lg"
                        style={{borderColor: TEAM[ac.team]}}
                        onClick={() => setSelected(ac)}
                        title={ac.name}>
                        <img src={`assets/characters/${ac.img}`} className="pixel" alt=""/>
                      </button>
                    );
                  })}
                </div>
                <div className="combo-name serif">{c.name}</div>
                <div className="combo-effect muted">{c.effect}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
