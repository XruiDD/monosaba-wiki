import { useEffect, useMemo, useState } from "react";
import AudioChip from "../components/AudioChip";
import type { SoundEntry } from "../components/AudioChip";
import { parseTutorialChapters } from "../data/tutorial";
import type { TutorialRecord } from "../types/wiki";

export default function TutorialPage({ tutorials, focus }: { tutorials: TutorialRecord[]; focus: string | null }) {
  const tutorial = tutorials?.find((entry) => entry.id === "tutorial_1");
  const chapters = useMemo(() => parseTutorialChapters(tutorial), [tutorial]);

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(0);

  // 搜索跳转到指定章节
  useEffect(() => {
    if (focus === null || focus === undefined) return;
    const n = parseInt(focus, 10);
    if (!Number.isNaN(n) && n >= 0 && n < chapters.length) setIdx(n);
  }, [focus, chapters.length]);

  const chapter = chapters[idx];
  const lines = useMemo(() => chapter?.lines || [], [chapter]);

  useEffect(() => { setRevealed(0); }, [idx]);
  useEffect(() => {
    if (!lines.length) return;
    if (revealed >= lines.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 450);
    return () => clearTimeout(t);
  }, [revealed, lines]);

  const SOUNDS: SoundEntry[] = [
    { f: "opening.ogg",     n: "开场"     },
    { f: "warden.ogg",      n: "典狱长"   },
    { f: "owl.ogg",         n: "猫头鹰"   },
    { f: "bell.ogg",        n: "钟声"     },
    { f: "morning.ogg",     n: "清晨"     },
    { f: "gloomy_piano.ogg",n: "阴郁钢琴" },
    { f: "bloom_piano.ogg", n: "绽放钢琴" },
    { f: "piano.ogg",       n: "钢琴"     },
    { f: "tribunal.ogg",    n: "审判庭"   },
    { f: "judge_quest.ogg", n: "庭审问询" },
    { f: "survey.ogg",      n: "调查"     },
    { f: "execution.ogg",   n: "处刑"     },
    { f: "corpse.ogg",      n: "遗体"     },
    { f: "bodyhit.ogg",     n: "击打"     },
  ];

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 陆 · WARDEN'S BRIEFING</div>
        <h1 className="page-title">典狱长旁白</h1>
        <p className="page-dek">
          五章节的开场白——这可爱的猫头鹰会替你把规则完整读一遍。你，只管记得住吗？
        </p>
      </div>

      <div className="tut-layout">
        <div className="tut-chapters">
          {chapters.map((c, i) => (
            <button key={i}
              className={`tut-chap ${idx === i ? "active" : ""}`}
              onClick={() => setIdx(i)}>
              <div className="tc-num mono">CAM · {i + 1}</div>
              <div className="tc-title serif">{c.title}</div>
            </button>
          ))}
        </div>

        <div className="tut-stage card">
          <div className="corner tl"/><div className="corner tr"/>
          <div className="corner bl"/><div className="corner br"/>

          <div className="tut-header">
            <div className="tut-owl">
              <img src="assets/characters/warden.png" className="pixel" alt="warden" decoding="async"/>
            </div>
            <div>
              <div className="page-kicker accent">典狱长 · 播报中</div>
              <div className="serif" style={{fontSize: 22}}>{chapter?.title}</div>
            </div>
            <button className="tut-replay" onClick={() => setRevealed(0)}>
              <span className="mono">[ REPLAY ]</span>
            </button>
          </div>

          <div className="tut-script">
            {lines.slice(0, revealed).map((line, i) => (
              <p key={i} className="tut-line serif" style={{animationDelay: `${i * 0.02}s`}}>
                {line.segments.map((segment, segmentIndex) => segment.annotation ? (
                  <span
                    className="tut-annotation"
                    data-annotation={segment.annotation}
                    aria-label={`${segment.text}，注释：${segment.annotation}`}
                    tabIndex={0}
                    key={segmentIndex}
                  >
                    {segment.text}
                  </span>
                ) : segment.text)}
              </p>
            ))}
            {revealed < lines.length && <span className="tut-cursor">▊</span>}
          </div>

          {revealed < lines.length && (
            <button className="tut-skip mono" onClick={() => setRevealed(lines.length)}>
              [ SKIP TO END ]
            </button>
          )}
        </div>
      </div>

      <div className="divider">音频资料 · 点击试听</div>
      <div className="audio-grid">
        {SOUNDS.map((s) => <AudioChip key={s.f} s={s}/>)}
      </div>
    </div>
  );
}
