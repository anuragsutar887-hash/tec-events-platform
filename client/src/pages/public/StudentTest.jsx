import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./StudentTest.css";

export default function StudentTest() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [event, setEvent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        let ev = null;
        try {
          const { data } = await supabase.from("events").select("*").eq("id", eventId).single();
          ev = data;
        } catch {}
        if (!ev) ev = { id: eventId, name: "Event #" + eventId, duration_minutes: 60 };
        setEvent(ev);

        let qs = [];
        try {
          const { data, error } = await supabase
            .from("event_questions")
            .select("*, questions(*)")
            .eq("event_id", eventId)
            .order("question_order", { ascending: true });
          if (!error && data && data.length > 0) {
            qs = data.map(eq => ({ ...eq.questions, question_order: eq.question_order, event_marks: eq.marks }));
          }
        } catch {}

        if (qs.length === 0) {
          try {
            const raw = localStorage.getItem("tec_local_event_questions_" + eventId);
            if (raw) {
              const assignedIds = JSON.parse(raw);
              const allRaw = localStorage.getItem("tec_local_questions");
              const all = allRaw ? JSON.parse(allRaw) : [];
              qs = all.filter(q => assignedIds.includes(q.id));
            }
          } catch {}
        }

        if (qs.length === 0) {
          setError("No questions assigned to this test yet. Contact your faculty coordinator.");
          setPhase("error");
          return;
        }

        const shuffled = [...qs].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
        setTimeLeft((ev?.duration_minutes || 60) * 60);
        setPhase("info");
      } catch (err) {
        setError("Failed to load test: " + err.message);
        setPhase("error");
      }
    }
    load();
  }, [eventId]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStart = () => { setPhase("test"); startTimer(); };

  const selectAnswer = (qId, optionNum) => setAnswers(prev => ({ ...prev, [qId]: optionNum }));

  const handleSubmit = (auto = false) => {
    if (!auto && !window.confirm("Are you sure you want to submit your test?")) return;
    clearInterval(timerRef.current);
    let correct = 0, totalMarks = 0, earnedMarks = 0;
    const breakdown = questions.map(q => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correct_option;
      totalMarks += Number(q.marks || 1);
      if (isCorrect) { correct++; earnedMarks += Number(q.marks || 1); }
      return { ...q, selected, isCorrect };
    });
    setResult({ correct, total: questions.length, earnedMarks, totalMarks, percentage: Math.round((earnedMarks / totalMarks) * 100), breakdown });
    setPhase("submitted");
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const formatTime = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

  if (phase === "loading") return (
    <div className="stest-shell">
      <div className="stest-loading"><div className="stest-spinner" /><p>Loading test paper…</p></div>
    </div>
  );

  if (phase === "error") return (
    <div className="stest-shell">
      <div className="stest-error card">
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h2>Test Unavailable</h2>
        <p>{error}</p>
        <button className="btn btn--primary" style={{ marginTop: "16px" }} onClick={() => navigate("/events")}>← Back to Events</button>
      </div>
    </div>
  );

  if (phase === "info") {
    return (
      <div className="stest-shell">
        <div className="stest-info card">
          <div className="stest-info__top">
            <span className="badge badge--bronze">ONLINE TEST</span>
            <h1 className="stest-info__title">{event?.name || "Event Test"}</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>Read all instructions carefully before starting.</p>
          </div>
          <div className="stest-info__stats">
            <div className="stest-info__stat"><span className="stest-info__num">{questions.length}</span><span>Questions</span></div>
            <div className="stest-info__stat"><span className="stest-info__num">{event?.duration_minutes || 60}</span><span>Minutes</span></div>
            <div className="stest-info__stat"><span className="stest-info__num">{questions.reduce((s, q) => s + Number(q.marks || 1), 0)}</span><span>Total Marks</span></div>
          </div>
          <div className="stest-info__rules">
            <h3>📋 Instructions</h3>
            <ul>
              <li>Each question has exactly one correct answer.</li>
              <li>No negative marking.</li>
              <li>Timer starts immediately when you click Start Test.</li>
              <li>Do not refresh the page — answers may be lost.</li>
              <li>Test auto-submits when time expires.</li>
            </ul>
          </div>
          <button className="btn btn--primary stest-start-btn" onClick={handleStart}>🚀 Start Test</button>
        </div>
      </div>
    );
  }

  if (phase === "test") {
    const isWarning = timeLeft <= 300;
    const answered = Object.keys(answers).length;
    return (
      <div className="stest-shell">
        <div className={"stest-timer-bar" + (isWarning ? " warning" : "")}>
          <div className="stest-timer-bar__left">
            <strong>{event?.name}</strong>
            <span style={{ opacity: 0.7, fontSize: "0.8rem" }}>{answered}/{questions.length} answered</span>
          </div>
          <div className={"stest-timer-bar__clock" + (isWarning ? " blink" : "")}>⏱ {formatTime(timeLeft)}</div>
          <button className="btn btn--primary btn--sm" onClick={() => handleSubmit(false)}>Submit</button>
        </div>

        <div className="stest-questions">
          {questions.map((q, idx) => {
            const sel = answers[q.id];
            return (
              <div key={q.id} className={"stest-q card" + (sel ? " answered" : "")} id={"q-" + idx}>
                <div className="stest-q__head">
                  <span className="stest-q__num">Q{idx + 1}</span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {q.subject && <span className="badge badge--tag" style={{ fontSize: "0.65rem" }}>{q.subject}</span>}
                    <span className="badge badge--bronze" style={{ fontSize: "0.65rem" }}>{q.difficulty}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{q.marks || 1} mark(s)</span>
                  </div>
                </div>
                <div className="stest-q__stmt">{q.question}</div>
                <div className="stest-q__opts">
                  {[1, 2, 3, 4].map(n => (
                    <label key={n} className={"stest-q__opt" + (sel === n ? " selected" : "")} onClick={() => selectAnswer(q.id, n)}>
                      <span className="stest-q__bubble">{n}</span>
                      <span>{q["option" + n]}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ textAlign: "center", padding: "24px 0 48px" }}>
            <button className="btn btn--primary btn--lg" onClick={() => handleSubmit(false)}>
              ✅ Submit Test ({answered}/{questions.length} answered)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "submitted" && result) {
    const { correct, total, earnedMarks, totalMarks, percentage, breakdown } = result;
    const grade = percentage >= 90 ? { label: "Excellent", color: "#16a34a" }
      : percentage >= 75 ? { label: "Good", color: "#2563eb" }
      : percentage >= 50 ? { label: "Average", color: "#d97706" }
      : { label: "Needs Improvement", color: "#dc2626" };

    return (
      <div className="stest-shell">
        <div className="stest-result">
          <div className="card stest-scoreboard">
            <div className="stest-scoreboard__inner">
              <div className="stest-scoreboard__circle" style={{ borderColor: grade.color }}>
                <span className="stest-scoreboard__pct" style={{ color: grade.color }}>{percentage}%</span>
                <span style={{ color: grade.color, fontSize: "0.8rem", fontWeight: 700 }}>{grade.label}</span>
              </div>
              <div className="stest-scoreboard__info">
                <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 800, marginBottom: "16px" }}>{event?.name}</h2>
                {[["Correct Answers", correct + " / " + total], ["Marks Earned", earnedMarks + " / " + totalMarks], ["Attempted", Object.keys(answers).length + " / " + total]].map(([k, v]) => (
                  <div key={k} className="stest-scoreboard__row">
                    <span>{k}</span><span className="font-mono fw-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "16px 24px", textAlign: "center", borderTop: "1px solid var(--border)" }}>
              <button className="btn btn--secondary" onClick={() => navigate("/events")}>← Back to Events</button>
            </div>
          </div>

          <div className="card stest-review">
            <div className="card__header">
              <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 800, margin: 0 }}>Answer Review</h3>
            </div>
            <div className="card__body">
              {breakdown.map((q, idx) => (
                <div key={idx} className={"stest-review-q" + (q.isCorrect ? " correct" : " wrong")}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span className="stest-q__num">Q{idx + 1}</span>
                    <span className={"badge " + (q.isCorrect ? "badge--success" : "badge--danger")}>
                      {q.isCorrect ? "+" + q.marks + " marks" : "0 marks"}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "0.9rem" }}>{q.question}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className={"stest-review-opt" + (n === q.correct_option ? " correct-ans" : n === q.selected && !q.isCorrect ? " wrong-ans" : "")}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginRight: "6px" }}>{n}.</span>
                        {q["option" + n]}
                        {n === q.correct_option && <span style={{ marginLeft: "8px", color: "#16a34a", fontWeight: 700 }}> ✓ Correct</span>}
                        {n === q.selected && !q.isCorrect && <span style={{ marginLeft: "8px", color: "#dc2626", fontWeight: 700 }}> ✗ Your answer</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
