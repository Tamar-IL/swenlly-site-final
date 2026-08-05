import type { Content } from "@/lib/content";

/* ============================================================
   Product-UI blocks — real UI inside cards (never generic cards).
   The home trio is a faithful port of the approved mockup.
   ============================================================ */

const BAR_HEIGHTS = [44, 60, 52, 78, 46, 95];

export function LeadsChartCard({ content }: { content: Content }) {
  const w = content.home.work.leads;
  return (
    <div className="card c-third hoverable">
      <div className="ch">
        <div>
          <div className="ttl">{w.ttl}</div>
          <div className="sub">{w.sub}</div>
        </div>
      </div>
      <div className="bars">
        {BAR_HEIGHTS.map((h, i) => (
          <div key={i} className="b" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="barlbl">
        {w.months.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="mini2">
        {w.mini.map((m) => (
          <div className="mini" key={m.k}>
            <div className="k">{m.k}</div>
            <div className="v">{m.v}</div>
            <div className="s">{m.s}</div>
          </div>
        ))}
      </div>
      <div className="btn">{w.btn}</div>
    </div>
  );
}

export function AutomationRuleCard({ content }: { content: Content }) {
  const r = content.home.work.rule;
  return (
    <div className="card c-third hoverable">
      <div className="ch">
        <div>
          <div className="ttl">{r.ttl}</div>
          <div className="sub">{r.sub}</div>
        </div>
        <div className="x">✕</div>
      </div>
      <div className="field">
        <span className="lab">{r.sourceLabel}</span>
        <div className="sel">
          {r.sourceValue}
          <span className="cv">▾</span>
        </div>
      </div>
      <div className="field">
        <div className="amt">
          <span className="lab" style={{ margin: 0 }}>
            {r.timeLabel}
          </span>
          <span className="num">{r.timeValue}</span>
        </div>
        <div className="track">
          <span className="fill" />
          <span className="knob" />
        </div>
        <div className="minmax">
          <span>{r.min}</span>
          <span>{r.max}</span>
        </div>
      </div>
      <div className="btn">{r.btn}</div>
    </div>
  );
}

export function SystemsBuiltCard({ content }: { content: Content }) {
  const s = content.home.work.systems;
  return (
    <div className="card c-third hoverable">
      <div className="ch">
        <div>
          <div className="ttl">{s.ttl}</div>
          <div className="sub">{s.sub}</div>
        </div>
        <div className="newp">{s.newp}</div>
      </div>
      {s.blocks.map((b) => (
        <div className="mblock" key={b.k}>
          <div className="k">{b.k}</div>
          <div className="num">{b.num}</div>
          <div className="prog">
            <i className={b.green ? "g" : ""} style={{ width: `${b.pct}%` }} />
          </div>
          <div className="mfoot">
            <span>{b.a}</span>
            <span>{b.b}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Service page mocks (same visual language, filling a full card) ---- */

export function ServiceMock({ type }: { type: string }) {
  switch (type) {
    case "chat":
      return (
        <div className="card hoverable" style={{ justifyContent: "flex-start" }}>
          <div className="ch">
            <div>
              <div className="ttl">swenlly.AI</div>
              <div className="sub">וואטסאפ · מענה אוטומטי</div>
            </div>
            <div className="x" style={{ background: "var(--green-soft)", color: "var(--green)", borderColor: "transparent" }}>
              ●
            </div>
          </div>
          <div className="chatwin" style={{ marginTop: 20 }}>
            <div className="msg user he">כמה עולה שיעור לילדים בגיל 5?</div>
            <div className="msg bot">
              יש לנו חוגים לגילי 4–6 בימי ג׳ ו-ה׳. אשמח לשלוח מחירון ולתאם שיעור ניסיון — רוצה? 🙂
            </div>
            <div className="msg user he">כן, מעולה</div>
          </div>
        </div>
      );
    case "metrics":
      return (
        <div className="card hoverable">
          <div className="ch">
            <div>
              <div className="ttl">דשבורד מכירות</div>
              <div className="sub">החודש · בזמן אמת</div>
            </div>
          </div>
          <div className="mblock" style={{ paddingTop: 18 }}>
            <div className="k">לידים חדשים</div>
            <div className="num">128</div>
            <div className="prog">
              <i style={{ width: "72%" }} />
            </div>
            <div className="mfoot">
              <span>72% טופלו</span>
              <span>36 פתוחים</span>
            </div>
          </div>
          <div className="mblock">
            <div className="k">שיעור סגירה</div>
            <div className="num">41%</div>
            <div className="prog">
              <i className="g" style={{ width: "41%" }} />
            </div>
            <div className="mfoot">
              <span>+6% מהחודש שעבר</span>
              <span>52 עסקאות</span>
            </div>
          </div>
        </div>
      );
    case "form":
      return (
        <div className="card hoverable">
          <div className="ch">
            <div>
              <div className="ttl">טופס הרשמה</div>
              <div className="sub">נשלח מהנייד · חתימה דיגיטלית</div>
            </div>
            <div className="x">✕</div>
          </div>
          <div className="field">
            <span className="lab">סוג המסמך</span>
            <div className="sel">
              הסכם שירות<span className="cv">▾</span>
            </div>
          </div>
          <div className="field">
            <span className="lab">חתימה</span>
            <div className="sel" style={{ fontFamily: "var(--disp)", color: "var(--tx)" }}>
              ✓ נחתם דיגיטלית
            </div>
          </div>
          <div className="btn">שליחה ל-CRM</div>
        </div>
      );
    case "workflow":
      return (
        <div className="card hoverable">
          <div className="ch">
            <div>
              <div className="ttl">זרימת אוטומציה</div>
              <div className="sub">רץ לבד · 4 שלבים</div>
            </div>
          </div>
          <div className="psteps" style={{ gridTemplateColumns: "1fr", marginTop: 14 }}>
            {[
              { h: "ליד חדש נכנס", p: "מהאתר או מוואטסאפ" },
              { h: "נפתח ב-CRM", p: "אוטומטית, בלי הקלדה" },
              { h: "הודעת ברוכים הבאים", p: "נשלחת ללקוח מיד" },
              { h: "תזכורת מעקב", p: "אצלכם בעוד יומיים" },
            ].map((s) => (
              <div className="pstep" key={s.h} style={{ paddingInlineStart: 34 }}>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "systems":
    default:
      return (
        <div className="card hoverable">
          <div className="ch">
            <div>
              <div className="ttl">מערכות בהזמנה</div>
              <div className="sub">נבנות סביב העסק · 2026</div>
            </div>
            <div className="newp">בהתאמה אישית</div>
          </div>
          <div className="mblock" style={{ paddingTop: 18 }}>
            <div className="k">אתר קורסים דיגיטלי</div>
            <div className="num">1,240</div>
            <div className="prog">
              <i style={{ width: "78%" }} />
            </div>
            <div className="mfoot">
              <span>78% תלמידים פעילים</span>
              <span>320 קורסים</span>
            </div>
          </div>
          <div className="mblock">
            <div className="k">מערכת ניהול וואטסאפ</div>
            <div className="num">540</div>
            <div className="prog">
              <i className="g" style={{ width: "62%" }} />
            </div>
            <div className="mfoot">
              <span>62% מענה אוטומטי</span>
              <span>38 פעילות</span>
            </div>
          </div>
        </div>
      );
  }
}
