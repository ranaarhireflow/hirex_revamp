"""Starter question pool — pre-seeded into question_templates on first run.

Coverage: 7 base roles + full-stack × R1/R2/R3, plus dedicated coding and
system-design questions for engineering roles. Each question is tagged with the
experience levels it fits — a Senior won't be asked the fresher fundamentals,
and a fresher won't be expected to design multi-region infrastructure.

Experience taxonomy: fresher | junior | mid | senior | lead | staff
"""

# Default "everyone above mid" range, used as a quick shorthand.
ALL = ["fresher", "junior", "mid", "senior", "lead", "staff"]
MID_UP = ["mid", "senior", "lead", "staff"]
SENIOR_UP = ["senior", "lead", "staff"]
LEAD_UP = ["lead", "staff"]
JUNIOR_DOWN = ["fresher", "junior"]
FOUNDATION = ["fresher", "junior", "mid"]


STARTER_QUESTIONS: list[dict] = [
    # ---------------- Backend ----------------
    {"role_type": "backend", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": ALL,
     "question_text": "Walk me through your background, then pick one backend system you built end-to-end. What did it do and what was your role?"},
    {"role_type": "backend", "round": "R1", "question_type": "technical", "difficulty": "easy",
     "experience_levels": JUNIOR_DOWN,
     "question_text": "Explain what happens when you type a URL into a browser and hit enter. Focus on what happens after the request reaches the server."},
    {"role_type": "backend", "round": "R1", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Tell me about a piece of backend infra you debugged in production — Postgres, Redis, a queue, anything. What broke and how did you find it?"},

    {"role_type": "backend", "round": "R2", "question_type": "coding", "difficulty": "medium",
     "experience_levels": FOUNDATION,
     "question_text": "Write a function that, given a list of API request timestamps, returns the per-minute QPS for the last hour. Walk me through your edge cases."},
    {"role_type": "backend", "round": "R2", "question_type": "coding", "difficulty": "hard",
     "experience_levels": MID_UP,
     "question_text": "Implement a thread-safe LRU cache from scratch — no external libs. Walk me through the data structures, then code it. We'll discuss tradeoffs."},
    {"role_type": "backend", "round": "R2", "question_type": "system_design", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "Design a rate limiter for an API gateway handling 10k req/s across a 5-pod deployment. Cover the algorithm, where state lives, and how you survive a pod restart."},
    {"role_type": "backend", "round": "R2", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "When would you reach for an eventually-consistent store vs a strongly-consistent one? Give a concrete example from your own work."},

    {"role_type": "backend", "round": "R3", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Tell me about a technical decision you made that turned out wrong. What was the cost and what did you learn?"},
    {"role_type": "backend", "round": "R3", "question_type": "system_design", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "You're tech lead for a payment service. p99 latency is 1.2s; target is 400ms. Walk me through where you'd start, how you'd diagnose, and how you'd prove the fix worked."},
    {"role_type": "backend", "round": "R3", "question_type": "behavioural", "difficulty": "hard",
     "experience_levels": LEAD_UP,
     "question_text": "You inherited a team where the senior engineer disagrees with the proposed architecture. How do you handle the next 30 days?"},

    # ---------------- Frontend ----------------
    {"role_type": "frontend", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": ALL,
     "question_text": "Pick a frontend feature or component you built recently that you're proud of. What did it do for the user — measurably?"},
    {"role_type": "frontend", "round": "R1", "question_type": "technical", "difficulty": "easy",
     "experience_levels": JUNIOR_DOWN,
     "question_text": "Explain the difference between `let`, `const`, and `var` in JavaScript. When would you use each?"},
    {"role_type": "frontend", "round": "R1", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Explain how React's reconciler decides what to re-render. Use a concrete example from something you've built."},

    {"role_type": "frontend", "round": "R2", "question_type": "coding", "difficulty": "medium",
     "experience_levels": FOUNDATION,
     "question_text": "Implement a debounce function from scratch. Then explain when you'd use debounce vs throttle."},
    {"role_type": "frontend", "round": "R2", "question_type": "coding", "difficulty": "hard",
     "experience_levels": MID_UP,
     "question_text": "You're rendering a list of 50,000 items and the browser freezes. Walk me through the techniques you'd try in order. Code the windowing approach in plain React."},
    {"role_type": "frontend", "round": "R2", "question_type": "system_design", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Design the state model for a multi-step form that persists across navigation and supports drafts. What stays in memory, what goes to the server, what goes to local storage?"},

    {"role_type": "frontend", "round": "R3", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Tell me about a disagreement you had with a designer about implementation feasibility. How did it resolve?"},
    {"role_type": "frontend", "round": "R3", "question_type": "system_design", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "Design the frontend state for a real-time collaborative whiteboard. Cover optimistic updates, conflict resolution, offline behavior, and how you'd test it."},

    # ---------------- Full-Stack ----------------
    {"role_type": "fullstack", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": ALL,
     "question_text": "Pick the most full-stack feature you've shipped — something where you owned everything from DB schema to UI. Walk me through the slice."},
    {"role_type": "fullstack", "round": "R1", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "A user reports a 'save' button does nothing. Walk me through how you'd debug — across browser, network, server, DB — and where you'd start."},

    {"role_type": "fullstack", "round": "R2", "question_type": "system_design", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Design a chat feature: message list, send box, presence, typing indicators. Cover the wire protocol, server state, and client-side rendering."},
    {"role_type": "fullstack", "round": "R2", "question_type": "coding", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Code a simple optimistic-update flow: a Like button that toggles instantly on click, rolls back on server error, and dedupes rapid clicks. Frontend and backend pseudo-code."},
    {"role_type": "fullstack", "round": "R2", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Your API returns a 500 sometimes under load — about 1 in 200 requests. Where do you start investigating, and what tools do you reach for?"},

    {"role_type": "fullstack", "round": "R3", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": SENIOR_UP,
     "question_text": "Tell me about a time the 'right' architecture and the 'fast' architecture pointed in different directions. Which did you pick and why?"},
    {"role_type": "fullstack", "round": "R3", "question_type": "system_design", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "Design the migration from a Django monolith to a backend-frontend split. Cover the rollout, the data layer, and how you'd avoid double-writes."},

    # ---------------- Data ----------------
    {"role_type": "data", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": ALL,
     "question_text": "Pick a dashboard or pipeline you built. What metric did it move and how do you know?"},
    {"role_type": "data", "round": "R1", "question_type": "technical", "difficulty": "easy",
     "experience_levels": JUNIOR_DOWN,
     "question_text": "Explain what an INNER vs LEFT vs FULL OUTER JOIN does. Give an example where each is the right choice."},
    {"role_type": "data", "round": "R1", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Walk me through a SQL query from the last month that you found tricky. What made it tricky?"},

    {"role_type": "data", "round": "R2", "question_type": "coding", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Write a SQL query that finds users whose 7-day rolling DAU dropped by more than 30% week-over-week. Walk me through the window functions."},
    {"role_type": "data", "round": "R2", "question_type": "technical", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "You inherit a 200-million-row events table. Common queries are slow. Walk me through what you investigate first, second, third — and the order matters."},

    {"role_type": "data", "round": "R3", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Tell me about a time your analysis convinced — or failed to convince — a stakeholder of something important. What did you take away?"},
    {"role_type": "data", "round": "R3", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": ALL,
     "question_text": "A PM asks you to 'just look at the data' for a vague question. Walk me through what you do before touching a query."},

    # ---------------- ML ----------------
    {"role_type": "ml", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": ALL,
     "question_text": "Walk me through one ML system you built that made it to production. What problem did it solve and how did you measure success?"},
    {"role_type": "ml", "round": "R1", "question_type": "technical", "difficulty": "easy",
     "experience_levels": JUNIOR_DOWN,
     "question_text": "Define overfitting in your own words. How would you detect it in a model you just trained?"},
    {"role_type": "ml", "round": "R2", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "You have a binary classifier with 95% accuracy. The class balance is 95:5. Why is the manager wrong to be happy, and what would you measure instead?"},
    {"role_type": "ml", "round": "R2", "question_type": "system_design", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "Design an evaluation framework for an LLM-powered customer-support agent. What do you measure, how, and who owns the feedback loop?"},
    {"role_type": "ml", "round": "R3", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Tell me about an ML project that didn't work. Why didn't it work — root cause, not symptoms?"},
    {"role_type": "ml", "round": "R3", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": SENIOR_UP,
     "question_text": "When would you choose a simpler model over a more accurate one? Concrete example from your own work."},

    # ---------------- DevOps / SRE ----------------
    {"role_type": "devops", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": MID_UP,
     "question_text": "Describe one incident you led the response to. Walk me through the timeline, not the lessons."},
    {"role_type": "devops", "round": "R1", "question_type": "technical", "difficulty": "easy",
     "experience_levels": JUNIOR_DOWN,
     "question_text": "Explain what a Linux process, thread, and file descriptor are. Where do these show up when you run a service?"},
    {"role_type": "devops", "round": "R1", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "What's your mental model for when to write infrastructure as code vs an ad-hoc script?"},
    {"role_type": "devops", "round": "R2", "question_type": "technical", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Walk me through a CI/CD pipeline you've built. What was the trigger, the stages, the failure handling, the rollback path?"},
    {"role_type": "devops", "round": "R2", "question_type": "system_design", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "Design the observability stack for a 200-microservice production environment. Cover logs, metrics, traces, alerts — and who reads what."},
    {"role_type": "devops", "round": "R3", "question_type": "behavioural", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "Tell me about a postmortem you wrote. What was the real root cause, and what changed in the team afterward?"},
    {"role_type": "devops", "round": "R3", "question_type": "system_design", "difficulty": "hard",
     "experience_levels": LEAD_UP,
     "question_text": "Design the deployment strategy for a 50-engineer team shipping a public-facing product to 200M users. Cover review gates, environments, and incident response."},

    # ---------------- Product ----------------
    {"role_type": "product", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": ALL,
     "question_text": "Pick a feature you shipped. What was the problem, who was the user, and how did you know it worked?"},
    {"role_type": "product", "round": "R1", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "How do you decide what NOT to build? Walk me through a recent example where you said no."},
    {"role_type": "product", "round": "R2", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Walk me through how you'd prioritize (a) a $2M revenue feature for one big customer vs (b) a UX fix annoying 20% of users. What info would you ask for first?"},
    {"role_type": "product", "round": "R2", "question_type": "system_design", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "Design the onboarding for a new B2B SaaS product. What's the first 60 seconds, the first session, the first week — and what metrics tell you it's working?"},
    {"role_type": "product", "round": "R3", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Tell me about a product call you made that turned out wrong. How did you find out, and what did you do?"},
    {"role_type": "product", "round": "R3", "question_type": "behavioural", "difficulty": "hard",
     "experience_levels": LEAD_UP,
     "question_text": "A senior engineer pushes back hard on a roadmap item you believe in. How do you handle it without ramming or capitulating?"},

    # ---------------- HR / Behavioural ----------------
    {"role_type": "hr", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": ALL,
     "question_text": "Tell me about yourself in two minutes. Focus on the arc that led you here, not the resume."},
    {"role_type": "hr", "round": "R1", "question_type": "behavioural", "difficulty": "easy",
     "experience_levels": ALL,
     "question_text": "Why are you looking to change jobs right now? What's pushing you out, and what's pulling you in?"},
    {"role_type": "hr", "round": "R2", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "Describe a conflict you had with a coworker. What was your role in resolving it — be specific about what you did and said."},
    {"role_type": "hr", "round": "R2", "question_type": "behavioural", "difficulty": "medium",
     "experience_levels": MID_UP,
     "question_text": "When have you disagreed with your manager? How did you raise it and what happened?"},
    {"role_type": "hr", "round": "R3", "question_type": "behavioural", "difficulty": "hard",
     "experience_levels": SENIOR_UP,
     "question_text": "Tell me about a project where you had to influence people without authority. What did you actually do?"},
    {"role_type": "hr", "round": "R3", "question_type": "behavioural", "difficulty": "hard",
     "experience_levels": MID_UP,
     "question_text": "What's a piece of feedback you got in the last year that changed how you work?"},
]
