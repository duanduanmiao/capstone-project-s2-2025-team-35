using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Data;
using ReactApp1.Server.Model;

namespace ReactApp1.Server
{
    public static class SeedData
    {
        public static void Initialize(EventDbContext context)
        {
            // Seed only on a fresh database
            if (context.Users.Any() || context.Events.Any() || context.EventRegistrations.Any())
                return;

            // ---------- Fixed + New Organizers ----------
            const int org1 = 1;   // Bernies
            const int org2 = 2;   // Prof. Mike Chen
            const int org3 = 3;   // Dove
            const int org4 = 7;   // Shan
            const int org5 = 8;   // Anni
            const int org6 = 9;   // Ziyun
            const int org7 = 10;  // Asma Shakil
            const int org8 = 11;  // Alex Lee
            const int org9 = 12;  // Mia Harris
            const int org10 = 13; // Daniel Park

            // ---------- Helper ----------
            int y = DateTime.UtcNow.Year;
            DateTime UtcOn(int yy, int m, int d, int hh, int mm = 0)
                => new DateTime(yy, m, d, hh, mm, 0, DateTimeKind.Utc);

            // ---------- Users ----------
            var users = new[]
            {
                // organizers (all @auckland.ac.nz format requested)
                new User { Id = org1,  GoogleId = "google_org_1",  Email = "bernies2018@gmail.com",         Username = "Bernies Wu",      Role = UserRole.Organizer, AvatarS3Key = "user-avatars/1/1.png" },
                new User { Id = org2,  GoogleId = "google_org_2",  Email = "mike.chen@auckland.ac.nz",      Username = "Prof. Mike Chen", Role = UserRole.Organizer, AvatarS3Key = "user-avatars/2/2.png" },
                new User { Id = org3,  GoogleId = "google_org_3",  Email = "cemsorganizer@gmail.com",       Username = "Test Organizer",  Role = UserRole.Organizer, AvatarS3Key = "user-avatars/3/3.png" },
                new User { Id = org4,  GoogleId = "google_org_4",  Email = "judy73733@gmail.com",           Username = "Shan",            Role = UserRole.Organizer, AvatarS3Key = "user-avatars/7/7.png" },
                new User { Id = org5,  GoogleId = "google_org_5",  Email = "axu747@aucklanduni.ac.nz",      Username = "Anni",            Role = UserRole.Organizer, AvatarS3Key = "user-avatars/8/8.png" },
                new User { Id = org6,  GoogleId = "google_org_6_virtual",  Email = "ziyuntan678@gmail.com",  Username = "Olivia Chen",  Role = UserRole.Organizer, AvatarS3Key = "user-avatars/9/9.png" },
                new User { Id = org7,  GoogleId = "google_org_7",  Email = "asma.shakil@auckland.ac.nz",    Username = "Asma Shakil",     Role = UserRole.Organizer, AvatarS3Key = "user-avatars/10/10.png" },
                new User { Id = org8,  GoogleId = "google_org_8",  Email = "alex.lee@auckland.ac.nz",       Username = "Alex Lee",        Role = UserRole.Organizer, AvatarS3Key = "user-avatars/11/11.png" },
                new User { Id = org9,  GoogleId = "google_org_9",  Email = "mia.harris@auckland.ac.nz",     Username = "Mia Harris",      Role = UserRole.Organizer, AvatarS3Key = "user-avatars/12/12.png" },
                new User { Id = org10, GoogleId = "google_org_10", Email = "daniel.park@auckland.ac.nz",    Username = "Daniel Park",     Role = UserRole.Organizer, AvatarS3Key = "user-avatars/13/13.png" },

                // students (UPI-like emails)
                new User { Id = 101, GoogleId = "google_stu_101", Email = "cemsstudent11@gmail.com",        Username = "Test Student",    Role = UserRole.Student,   AvatarS3Key = "user-avatars/101/21.png" },
                new User { Id = 102, GoogleId = "google_stu_102", Email = "sofi234@aucklanduni.ac.nz",      Username = "Sofia Li",        Role = UserRole.Student,   AvatarS3Key = "user-avatars/102/22.png" },
                new User { Id = 103, GoogleId = "google_stu_103", Email = "aime345@aucklanduni.ac.nz",      Username = "Aimee Chen",      Role = UserRole.Student,   AvatarS3Key = "user-avatars/103/23.png" },
                new User { Id = 104, GoogleId = "google_stu_104", Email = "yuki456@aucklanduni.ac.nz",      Username = "Yuki Tanaka",     Role = UserRole.Student,   AvatarS3Key = "user-avatars/104/24.png" },
                new User { Id = 105, GoogleId = "google_stu_105", Email = "harr567@aucklanduni.ac.nz",      Username = "Harry Kim",       Role = UserRole.Student,   AvatarS3Key = "user-avatars/105/25.png" },
                new User { Id = 106, GoogleId = "google_stu_106", Email = "ming678@aucklanduni.ac.nz",      Username = "Ming Zhao",       Role = UserRole.Student,   AvatarS3Key = "user-avatars/106/26.png" },
                new User { Id = 107, GoogleId = "google_stu_107", Email = "emil789@aucklanduni.ac.nz",      Username = "Emilia Singh",    Role = UserRole.Student,   AvatarS3Key = "user-avatars/107/27.png" },
                new User { Id = 108, GoogleId = "google_stu_108", Email = "noah012@aucklanduni.ac.nz",      Username = "Noah Patel",      Role = UserRole.Student,   AvatarS3Key = "user-avatars/108/28.png" },
                new User { Id = 109, GoogleId = "google_stu_109", Email = "kevi234@aucklanduni.ac.nz",      Username = "Kevin Huang",     Role = UserRole.Student,   AvatarS3Key = "user-avatars/109/29.png" },
                new User { Id = 110, GoogleId = "google_stu_110", Email = "aria345@aucklanduni.ac.nz",      Username = "Aria Kaur",       Role = UserRole.Student,   AvatarS3Key = "user-avatars/110/30.png" },
                new User { Id = 111, GoogleId = "google_stu_111", Email = "toma456@aucklanduni.ac.nz",      Username = "Tom Ashton",      Role = UserRole.Student,   AvatarS3Key = "user-avatars/111/31.png" },
                new User { Id = 112, GoogleId = "google_stu_112", Email = "sara567@aucklanduni.ac.nz",      Username = "Sara Wong",       Role = UserRole.Student,   AvatarS3Key = "user-avatars/112/32.png" },
                new User { Id = 113, GoogleId = "google_stu_113", Email = "tama678@aucklanduni.ac.nz",      Username = "Tamaiti Reid",    Role = UserRole.Student,   AvatarS3Key = "user-avatars/113/33.png" },
                new User { Id = 114, GoogleId = "google_stu_114", Email = "yara789@aucklanduni.ac.nz",      Username = "Yara Haddad",     Role = UserRole.Student,   AvatarS3Key = "user-avatars/114/34.png" },
                new User { Id = 115, GoogleId = "google_stu_115", Email = "pete890@aucklanduni.ac.nz",      Username = "Peter Ross",      Role = UserRole.Student,   AvatarS3Key = "user-avatars/115/35.png" },
                new User { Id = 116, GoogleId = "google_stu_116", Email = "toby901@aucklanduni.ac.nz",      Username = "Toby Li",         Role = UserRole.Student,   AvatarS3Key = "user-avatars/116/36.png" },
                new User { Id = 117, GoogleId = "google_stu_117", Email = "nina012@aucklanduni.ac.nz",      Username = "Nina Park",       Role = UserRole.Student,   AvatarS3Key = "user-avatars/117/37.png" },
                new User { Id = 118, GoogleId = "google_stu_118", Email = "xavi123@aucklanduni.ac.nz",      Username = "Xavier Luo",      Role = UserRole.Student,   AvatarS3Key = "user-avatars/118/38.png" },
                new User { Id = 119, GoogleId = "google_stu_119", Email = "luca234@aucklanduni.ac.nz",      Username = "Lucas Nguyen",    Role = UserRole.Student,   AvatarS3Key = "user-avatars/119/39.png" },
                new User { Id = 120, GoogleId = "google_stu_120", Email = "megw345@aucklanduni.ac.nz",      Username = "Megan White",     Role = UserRole.Student,   AvatarS3Key = "user-avatars/120/40.png" },
            };
            context.Users.AddRange(users);
            context.SaveChanges();
            
            // ✅ 重置 Users 序列
            context.Database.ExecuteSqlRaw(@"
        SELECT setval(
            pg_get_serial_sequence('""Users""', 'Id'),
            (SELECT MAX(""Id"") FROM ""Users""),
            true
        );
    ");

            // ---------- Event IDs ----------
            // Technology 100x, Creative 200x, Sports 300x, Wellness 400x, Academic 500x
            const int t101 = 101, t102 = 102, t103 = 103, t104 = 104, t105 = 105;
            const int c201 = 201, c202 = 202, c203 = 203, c204 = 204;
            const int s301 = 301, s302 = 302, s303 = 303, s304 = 304;
            const int w401 = 401, w402 = 402, w403 = 403, w404 = 404;
            const int w405 = 405;
            const int a501 = 501, a502 = 502, a503 = 503, a504 = 504, a505 = 505; // new HCI lecture

            // ---------- Events (21 total; existing 20 redistributed + new a505) ----------
            var events = new[]
            {
                // ===== Technology (4) =====
                new Event {
                    Id = t101,
                    Title = "Edge AI on Campus: Practical Quantization & On-Device Demos",
                    StartAt = UtcOn(y, 11, 6, 17),
                    EndAt   = UtcOn(y, 11, 6, 18, 30),
                    Location = "Sir Owen G Glenn Building, Level 0, OGGB4 Lecture Theatre, 12 Grafton Road, Auckland",
                    Category = "Technology", Capacity = 80, OrganizerId = org8, // Alex
                    ImageS3Key = "event-images/101/edge ai.png",
                    Description =
@"This lecture explores how human–computer interaction translates core principles into everyday product decisions that respect users and reduce friction. We focus on practical patterns teams can ship now: clear signposting and feedback, predictable navigation, and settings that place users in control without overwhelming them. We’ll examine inclusive defaults that lower cognitive load, content controls that reduce distraction, and privacy‑aware telemetry that explains what is collected and why—so trust is earned, not assumed.

Grounding the discussion in HCI fundamentals—visibility, affordances, feedback, constraints, and error tolerance—we map each principle to small interface choices across education, health, and public service platforms. You will see how empty, loading, success, and error states shape comprehension; how consent and preferences can be presented briefly yet transparently; and how copy tone, iconography, and motion influence confidence. Short vignettes highlight the outsized impact of metadata labels, notification timing, and photo/document handling on different user groups.

The aim is to give designers and engineers a portable checklist for respectful, inclusive systems: start with understandable defaults, support graceful overrides, make consequences visible, and document trade‑offs plainly. We finish with guidance on lightweight user research etiquette, decision logs your teammates will actually read, and review rituals that keep quality high when deadlines are tight. Attendees leave with examples and templates they can adapt directly to coursework, capstones, and internal tools."
                },
                new Event {
                    Id = t102,
                    Title = "Kubernetes for Student Projects (Online)",
                    StartAt = UtcOn(y, 11, 12, 19),
                    EndAt   = UtcOn(y, 11, 12, 20, 30),
                    Location = "Online via Zoom (link sent after registration)",
                    Category = "Technology", Capacity = 80, OrganizerId = org2, // Mike
                    ImageS3Key = "event-images/102/Kubernetes_Projects.avif",
                    Description =
@"This beginner-friendly workshop shows how to deploy a small two-tier campus app using Kubernetes without drowning in YAML. We start with the core abstractions—Deployments, Jobs, and Services—explaining what problems each solves and how they cooperate during routine updates. You will containerise locally, push to a registry, and roll out changes safely, with an emphasis on predictable behaviour close to assignment deadlines. Along the way, we unpack environment variables, ConfigMaps and Secrets, plus resource requests that keep nodes healthy on modest clusters. 

The second half turns to operations and recovery. Using a realistic failure set, you will diagnose image-pull errors, CrashLoopBackOffs, and networking surprises with a short checklist and repeatable commands. We discuss cost-aware testing, log collection you can read quickly, and simple readiness probes that reflect real application health rather than wishful thinking. By the end, you’ll have a compact template repository that your team can fork, instructions for adding HTTPS later, and the confidence to argue when Kubernetes is helpful—and when a single container is the wiser choice."
                },
                new Event {
                    Id = t103,
                    Title = "Figma → React: Handoff Without Tears",
                    StartAt = UtcOn(y, 11, 14, 16),
                    EndAt   = UtcOn(y, 11, 14, 17, 30),
                    Location = "Faculty of Engineering, the University of Auckland,20 Symonds Street, Auckland Central, Auckland 1010",
                    Category = "Technology", Capacity = 80, OrganizerId = org6, // Ziyun
                    ImageS3Key = "event-images/103/figma to react.png",
                    Description =
@"Design specifications often look perfect yet feel wrong when translated into code. This clinic focuses on the stitches between design tokens and JSX so teams ship interfaces that read clearly, scale gracefully, and remain accessible. We start by mapping spacing ramps and type scales to CSS Grid and Flex layouts, then demonstrate how to convert auto-layout structures into resilient components with predictable breakpoints. You will practice adding interaction states that are visible to both mouse and keyboard users, incorporating sensible focus rings and ARIA roles so assistive technologies understand the intended behaviour. 

Together we rebuild a small screen from a public Figma file, compare it to the original using quick audits, and note common pitfalls like implicit fixed heights, ambiguous hit areas, and motion that hides content. The final segment provides a lightweight handoff template: component names, props, content states (empty, loading, error), and measurable acceptance criteria so reviews are faster and less subjective. You will leave with patterns that reduce back-and-forth in student teams and a vocabulary to defend small design choices that meaningfully improve perceived quality."
                },
                new Event {
                    Id = t104,
                    Title = "Campus Data APIs: From Swagger to a Shareable Dashboard",
                    StartAt = UtcOn(y, 11, 18, 10),
                    EndAt   = UtcOn(y, 11, 18, 12),
                    Location = "Auckland Law School, 9 Eden Crescent, Auckland Central, Auckland 1010",
                    Category = "Technology", Capacity = 60, OrganizerId = org8, // Alex
                    ImageS3Key = "event-images/104/data api.jpg",
                    Description =
@"Universities publish a surprising amount of operational data through simple HTTP endpoints—event listings, facilities information, or small time series that illuminate campus life. This workshop turns that raw material into a concise, stable dashboard suitable for assessment or club use. We start by reading an OpenAPI / Swagger description and translating it into the minimum viable client: correct Accept headers, pagination, and patient back-off when rate limits appear. With that foundation, we move into a live notebook to clean responses, annotate missing fields, and define tidy, testable transforms that survive changing semesters. 

The second half focuses on communication. We sketch a single-page front-end with clear loading states, empty and error content, and interactions that work well on small screens. Participants see how micro-caching and simple invalidation make interfaces feel instant without complex infrastructure, and how to document data lineage so reviewers understand limitations. By the end, you will export a small, readable codebase—client, transforms, and a dashboard view—that others can reuse. The goal is not pixel-perfect design but a dependable pipeline from “API page” to “explainable visual” that demonstrates engineering discipline and storytelling clarity."
                },
                new Event {
                    Id = t105,
                    Title = "Discover CEMS: Know Our Website",
                    StartAt = UtcOn(y, 11, 25, 14),   // 2:00 PM
                    EndAt   = UtcOn(y, 11, 25, 17),   // 5:00 PM
                    Location = "Sir Owen G Glenn Building, Case Room 1 (058), 12 Grafton Road, Auckland",
                    Category = "Technology",
                    Capacity = 50,
                    OrganizerId = org3, // Test Organizer
                    ImageS3Key = "event-images/105/data api.jpg",
                    Description =
                @"Come learn how the CEMS website helps students discover events and organizers manage them easily. We’ll demo browsing and registration, show the organizer workflow, and share tips for better engagement. Ideal for clubs, societies, and first-time users. Bring a laptop for the hands-on segment."
                },

                // ===== Creative (4) =====
                new Event {
                    Id = c201,
                    Title = "UX Jam: Micro-interactions that Spark Joy",
                    StartAt = UtcOn(y, 11, 6, 17, 30),
                    EndAt   = UtcOn(y, 11, 6, 19),
                    Location = "Auckland Stone Lecture Theatre (801-316), 10 Symonds Street, Auckland Central, Auckland 1010",
                    Category = "Creative", Capacity = 80, OrganizerId = org6, // Ziyun
                    ImageS3Key = "event-images/201/ux jam.jpg",
                    Description =
@"Polish in student products rarely comes from adding features; it emerges from dozens of small decisions about focus rings, hover feedback, pressed states, and motion that clarifies rather than distracts. This fast-paced jam creates a collaborative space to design those moments with intent. We begin with crisp lightning talks that unpack what makes micro-interactions trustworthy: visible affordances for keyboard and touch, contrast and timing that support reading flow, and state choreography across empty, loading, success, and error. 

Teams then tackle two common campus flows—event sign-up and timetable search—producing variants and testing them on peers to observe confusion, learnability, and accessibility. You will iterate using short critique cycles and simple heuristics: reduce motion where it hides content, add motion where it directs attention, and keep semantics observable for assistive tech. We finish by assembling a tiny pattern library annotated with do/don’t notes and links you can cite in future assignments. You’ll leave with practical patterns, a vocabulary for discussing them with developers, and the confidence to defend small design choices that have outsized impact on perceived quality."
                },
                new Event {
                    Id = c202,
                    Title = "City Campus Dusk Photography Walk",
                    StartAt = UtcOn(y, 11, 8, 18),
                    EndAt   = UtcOn(y, 11, 8, 20),
                    Location = "38 Princes Street, Auckland Central, Auckland 1010",
                    Category = "Creative", Capacity = 30, OrganizerId = org5, // Anni
                    ImageS3Key = "event-images/202/photography walk.jpg",
                    Description =
@"This gentle two-kilometre loop explores golden hour on City Campus. Beginners and enthusiasts are equally welcome, and any phone or camera will do. We focus on composition fundamentals that travel well across devices: leading lines that organise busy scenes, foreground layering to add depth, and viewpoint changes that reduce distractions. Short stops near the ClockTower, library façades, and Symonds Street provide safe spaces to practice low-light settings without rushing. 

At each stop, the facilitator offers a composition prompt—silhouettes, reflections, or figure-to-ground—and quick tips for steady shooting at slower shutter speeds. We also cover respectful photography around people, basic safety at dusk, and simple edits that keep colour natural when posting online. Participants share a few frames for supportive feedback, trading tips that reflect different cameras and styles. You will leave with a small set of campus-themed images suitable for a portfolio, club page, or printed keepsake, plus a checklist you can reuse for future walks as daylight shortens."
                },
                new Event {
                    Id = c203,
                    Title = "Rapid Prototyping Studio: A Tappable Flow in 90 Minutes",
                    StartAt = UtcOn(y, 11, 11, 18),
                    EndAt   = UtcOn(y, 11, 11, 19, 30),
                    Location = "12 Grafton Road, Auckland Central, Auckland 1010, Sir Owen G Glenn Building, Level 3, Room 310",
                    Category = "Creative", Capacity = 24, OrganizerId = org5, // Anni
                    ImageS3Key = "event-images/203/rapid prototyping.jpg",
                    Description =
@"Starting from a short prompt based on campus life, we sketch three divergent directions, converge on one, and build a tappable prototype ready for hallway tests. The emphasis is clarity over polish. You will annotate transitions, define sensible hit areas, and document content states—empty, loading, success, error—so the experience survives real data. Short peer reviews surface confusion quickly, enabling you to iterate without attachment. 

We provide a minimal component set to speed assembly and a naming scheme that keeps files understandable when teammates join later. The closing segment shows how to capture quick footage and notes for assessment: what changed after testing, where accessibility improved, and what remains risky. You will leave with a prototype that communicates intent, a snapshot of evidence from lightweight research, and a path to implement the flow confidently in code."
                },
                new Event {
                    Id = c204,
                    Title = "Poster Design for Student Events",
                    StartAt = UtcOn(y, 11, 18, 15),
                    EndAt   = UtcOn(y, 11, 18, 16, 30),
                    Location = "Faculty of Arts and Education, Building 201, Room 342",
                    Category = "Creative", Capacity = 40, OrganizerId = org9, // Mia
                    ImageS3Key = "event-images/204/poster design.png",
                    Description =
@"Campus posters compete for attention on crowded noticeboards and tiny screens. This practical session focuses on hierarchy, readable type, and clear calls-to-action so your message lands in seconds. We begin by defining the event’s audience and must-know details, then choose a type pairing and rhythm that suits print and digital placements. Participants practice establishing contrast through size, weight, and spacing rather than colour alone, making designs accessible and resilient to photocopying. 

We then cover asset workflow: finding imagery with appropriate rights, preparing files for print and social, and exporting variants without muddy edges or unexpected colour shifts. A short segment on accessibility highlights minimum contrast, legible line lengths, and QR codes that scan reliably. You will leave with a starter poster adapted to your current event, a checklist for approvals and file naming, and confidence to iterate quickly when details change close to publication."
                },


                new Event {
                    Id = w405,
                    Title = "Mind Matters for Makers: Mental Fitness for Design and Dev Teams",
                    StartAt = UtcOn(y, 11, 22, 16),
                    EndAt   = UtcOn(y, 11, 22, 17),
                    Location = "Faculty of Engineering, 20 Symonds Street, Auckland Central, Auckland 1010",
                    Category = "Wellness", Capacity = 60, OrganizerId = org6, // Ziyun
                    ImageS3Key = "event-images/405/mindful stretch.jpg",
                    Description =
@"Creative and technical students often sprint between critiques, demos, and deadlines. This practical lecture distils mental‑fitness habits that protect focus and mood during intense build cycles without demanding perfection. We start by turning big ideas—sleep, movement, nutrition, and connection—into small, repeatable routines that fit real timetables. You’ll learn how to set pre‑work cues that ease context switching, structure short breaks that actually restore attention, and use post‑mortems to reduce future stress instead of reliving it.

We then look at studio and team dynamics. Simple rituals—clear scopes, visible checklists, and kinder pull‑request language—lower background anxiety and make collaboration feel safer. We discuss how to notice early signs of overload in yourself and teammates, and how to renegotiate scope respectfully before burnout sets in. Short exercises cover breath pacing for rapid down‑shifting, micro‑stretch flows for keyboard shoulders, and a two‑minute reflection that improves sleep on heavy nights.

The session emphasises agency and consent: you choose what to adopt, at the pace that fits. We conclude with a lightweight personal operating manual template—working hours, communication preferences, ideal review windows—and a team “health check” you can run in fifteen minutes. You will leave with a one‑page playbook, practical scripts for difficult weeks, and a calmer way to ship good work when it matters most."
                },
                // ===== Sports (4) =====
                new Event {
                    Id = s301,
                    Title = "Social Badminton Night",
                    StartAt = UtcOn(y, 11, 7, 18),
                    EndAt   = UtcOn(y, 11, 7, 20),
                    Location = "Hiwa Recreation Centre, 17 Symonds Street, Auckland Central, Auckland 1010",
                    Category = "Sports", Capacity = 48, OrganizerId = org1, // Bernies
                    ImageS3Key = "event-images/301/social badminton.jpg",
                    Description =
@"This relaxed doubles night welcomes mixed abilities and prioritises movement, safety, and friendly coaching. After a gentle warm-up and court briefing, players rotate partners every fifteen minutes to keep games fresh and inclusive. Volunteers offer quick tips on footwork, serve consistency, and simple shot selection so rallies lengthen as the session progresses. Non-marking shoes are required; a small pool of spare rackets will be available for newcomers. 

The format is designed to fit around coursework. Short games mean everyone stays active without waiting long on the sidelines, and clear substitutions keep groups balanced. We emphasise respectful play, safe spacing at the net, and hydration. If you are returning from injury or trying the sport for the first time, you can set an easy pace while still enjoying good rallies. Expect to leave with a light sweat, a few new contacts for future games, and a small list of drills you can practice between sessions."
                },
                new Event {
                    Id = s302,
                    Title = "Campus 5K Run — Grafton Loop",
                    StartAt = UtcOn(y, 11, 9, 17, 45),
                    EndAt   = UtcOn(y, 11, 9, 18, 45),
                    Location = "Sir Owen G Glenn Building, 12 Grafton Road, Auckland Central, Auckland 1010",
                    Category = "Sports", Capacity = 60, OrganizerId = org4, // Shan
                    ImageS3Key = "event-images/302/5k run.jpg",
                    Description =
@"A social 5K designed for mixed abilities at the end of a busy day. Instead of racing, we pace in small groups from 5:00 to 7:00 min/km, using campus paths and the Grafton Gully route for a forgiving profile and safe crossings. A short briefing covers visibility, surfaces, and passing etiquette, then runners set off with volunteer pacers who keep effort conversational. New runners benefit from breathing and cadence tips; experienced participants treat it as an easy aerobic flush between study blocks. 

Safety and inclusion underpin the format. We encourage layers suitable for dusk and light rain, highlight how to negotiate shared paths, and provide a regroup point so no one finishes alone. Light mobility at the end supports recovery and reduces next-day stiffness before labs or study sessions. Whether you are building consistency, meeting new people, or resetting after screen time, the focus is the same: steady movement, better headspace, and a small win that fits real student schedules."
                },
                new Event {
                    Id = s303,
                    Title = "Beginner's Table Tennis",
                    StartAt = UtcOn(y, 11, 12, 16, 30),
                    EndAt   = UtcOn(y, 11, 12, 18),
                    Location = "Recreation Centre, 17 Symonds Street, Auckland Central, Auckland 1010",
                    Category = "Sports", Capacity = 20, OrganizerId = org2, // Mike
                    ImageS3Key = "event-images/303/table-tennis.webp",
                    Description =
@"This friendly clinic introduces core skills—grip, stance, and basic footwork—then moves quickly into short drills and games so beginners experience satisfying rallies. Coaches demonstrate consistent service, controlled returns, and simple placement patterns that build confidence without overwhelming jargon. Equipment is provided for those without bats, and players are paired by level so everyone gets appropriate challenges and encouragement. 

Between games, volunteers share cues for reading spin and recovering position after each shot. We also discuss etiquette, safety on shared courts, and light stretching to keep shoulders happy during study week. By the end, you will understand a few durable practice routines, know how to track progress in future sessions, and likely have exchanged contacts for more casual play."
                },
                new Event {
                    Id = s304,
                    Title = "Basketball Pickup — City Campus",
                    StartAt = UtcOn(y, 11, 19, 18),
                    EndAt   = UtcOn(y, 11, 19, 20),
                    Location = "Recreation Centre, 17 Symonds Street, Auckland Central, Auckland 1010",
                    Category = "Sports", Capacity = 24, OrganizerId = org1, // Bernies
                    ImageS3Key = "event-images/304/basketball.jpeg",
                    Description =
@"Short 4-on-4 games keep everyone moving and reduce wait times. After a dynamic warm-up, teams agree on simple rules—running clock, quick checks, and respectful contact—so games stay friendly and decisions smooth. Rolling substitutions allow even minutes across players and make it easier to manage energy during busy weeks. We ask participants to bring a dark and a light top for quick swaps and fair match-ups. 

The session suits a range of abilities. Newer players get space to practice spacing and simple cuts; experienced players can work on communication and defensive discipline without pressure. We finish with light stretching and a quick tidy-up so the court is ready for the next group. Expect a good sweat, a few tight games, and new contacts for future runs."
                },

                // ===== Wellness (4) =====
                new Event {
                    Id = w401,
                    Title = "Mindful Stretch for Coders",
                    StartAt = UtcOn(y, 11, 9, 17),
                    EndAt   = UtcOn(y, 11, 9, 17, 45),
                    Location = "University of Auckland Science Centre (Building 302)",
                    Category = "Wellness", Capacity = 35, OrganizerId = org4, // Shan
                    ImageS3Key = "event-images/401/mindful stretch.jpg",
                    Description =
@"A 45-minute reset designed for long study sessions and heavy laptop use. We combine simple breathing patterns with neck, shoulder, and back mobility you can repeat between sprints of work. The routine uses everyday clothes and minimal floor contact, making it practical for labs and libraries. After a brief check-in on posture and common pain points, we explore gentle ranges rather than extreme stretches, focusing on consistency and comfort. 

You will learn a short sequence that fits into five-minute breaks: breath to settle the nervous system, movements that counter forward-head posture, and light activation so sitting afterward feels easier. We also discuss micro-habits—screen height, chair adjustments, and micro-pauses—that accumulate benefits across the week. You will leave with a printable one-pager and the confidence to adapt the sequence to your own schedule without any prior yoga experience."
                },
                new Event {
                    Id = w402,
                    Title = "Sleep & Focus Essentials (Online)",
                    StartAt = UtcOn(y, 11, 10, 19),
                    EndAt   = UtcOn(y, 11, 10, 20),
                    Location = "Online Webinar (Zoom)",
                    Category = "Wellness", Capacity = 80, OrganizerId = org9, // Mia
                    ImageS3Key = "event-images/402/sleep and focus.jpg",
                    Description =
@"This practical webinar collects small changes that protect attention during assignment season. We cover light exposure and routine anchors that stabilise sleep across variable timetables, realistic caffeine timing—including when to stop—and the art of a genuinely restorative short nap. You will learn how to recover from a late night without wrecking the rest of the week, and how to create a pre-work ritual that signals “time to focus” even in noisy flats. 

We also touch on workload triage and digital hygiene: batching notifications, choosing when to block distracting sites, and creating a simple wind-down that helps you fall asleep faster. The goal is not perfection but a repeatable playbook that works under pressure. Participants receive a printable checklist and example schedules that can be adapted to different course loads."
                },
                new Event {
                    Id = w403,
                    Title = "Budget-Friendly Meal Prep",
                    StartAt = UtcOn(y, 11, 14, 12),
                    EndAt   = UtcOn(y, 11, 14, 13),
                    Location = "University of Auckland Science Centre (Building 302)",
                    Category = "Wellness", Capacity = 25, OrganizerId = org9, // Mia
                    ImageS3Key = "event-images/403/budget friendly.webp",
                    Description =
@"Good food helps learning, but budgets and busy timetables make variety hard. This compact session demonstrates a weekly prep flow that turns supermarket specials into two flexible base recipes you can remix. We cover planning a shopping list, safe storage, and microwave-friendly techniques that preserve texture. You will practice a few knife skills that speed prep safely and learn substitutions for seasonal produce, dietary preferences, and shared-kitchen realities. 

We aim for practical, repeatable cooking rather than elaborate dishes. Expect to leave with a one-page plan, costs for a week of lunches, and ideas for flavour boosts that require little time or equipment. Confidence comes from having a default you can rely on when study ramps up."
                },
                new Event {
                    Id = w404,
                    Title = "Study-Week Breathwork",
                    StartAt = UtcOn(y, 11, 20, 17, 30),
                    EndAt   = UtcOn(y, 11, 20, 18, 15),
                    Location = "University of Auckland Science Centre (Building 302)",
                    Category = "Wellness", Capacity = 30, OrganizerId = org10, // Daniel
                    ImageS3Key = "event-images/404/Breathwork.webp",
                    Description =
@"Nerves before presentations are normal; a few simple breathing patterns can reliably settle them. This session introduces box breathing, extended exhales, and short cadence drills that shift state in minutes. We discuss when each technique helps—calming pre-exam jitters, resetting after intense study, or preparing to speak—and how to build a personalised five-minute routine that fits just outside the exam room. 

Practicality drives the format. Movements can be done standing with everyday clothes, and guidance emphasises comfort over performance. You will leave with a concise reference card and the confidence to deploy breathwork thoughtfully during study week."
                },

                // ===== Academic (5 with new a505) =====
                new Event {
                    Id = a501,
                    Title = "Case Interview Fundamentals",
                    StartAt = UtcOn(y, 11, 5, 17),
                    EndAt   = UtcOn(y, 11, 5, 18, 30),
                    Location = "Case room 3 (055), Level 0, Sir Owen G Glenn Building, 12 Grafton Road",
                    Category = "Academic", Capacity = 28, OrganizerId = org2, // Mike
                    ImageS3Key = "event-images/501/case interview.jpg",
                    Description =
@"An entry-level workshop for consulting and product management candidates who want structure under time pressure. We practise building issue trees, translating ambiguous prompts into hypotheses, and applying MECE thinking to market sizing and profitability cases. Short drills teach how to narrate assumptions, draw clean charts under haste, and land clear summaries. You will learn common rescue moves—anchoring when data is missing, reframing unproductive branches, and choosing a path when time is short. 

We then shift to interactive pair practice with timed feedback so you experience both interviewer and candidate perspectives. Guidance emphasises credibility over theatrics: sensible maths, transparent logic, and calm handling of surprises. You will leave with a printable note sheet, a small library of practice prompts, and suggestions for building a consistent routine in the weeks before interviews."
                },
                new Event {
                    Id = a502,
                    Title = "Research Skills: Build a Literature Review Skeleton in Two Hours",
                    StartAt = UtcOn(y, 11, 11, 15),
                    EndAt   = UtcOn(y, 11, 11, 17),
                    Location = "Physics Lecture Theatre 1 (PLT1/303-G20), University of Auckland Science Centre (Building 302)",
                    Category = "Academic", Capacity = 80, OrganizerId = org1, // Bernies
                    ImageS3Key = "event-images/502/Build a Literature Review Skeleton in Two Hours.jpg",
                    Description =
@"A focused session that turns an overwhelming topic into a navigable map you can extend. Together we define search boundaries, construct a screening table, and extract reusable claims and evidence with accurate citations. You will learn to group sources into themes and tensions rather than a flat list, revealing gaps that motivate your research questions. We demonstrate reference managers for reliable metadata and show how to avoid duplication when collaborators join later. 

The second hour builds a concise ‘skeleton’: introduction, key strands, points of disagreement, and a provisional conclusion that explicitly lists uncertainties. We provide templates for Zotero and lightweight notes systems so your work transfers cleanly into a formal write-up. You will leave with momentum and a plan rather than another pile of PDFs."
                },
                new Event {
                    Id = a503,
                    Title = "SQL for Analysts: Window Functions without Tears",
                    StartAt = UtcOn(y, 11, 6, 17, 30),
                    EndAt   = UtcOn(y, 11, 6, 19),
                    Location = "Faculty of Arts and Education, Building 201, Room 342",
                    Category = "Academic", Capacity = 40, OrganizerId = org10, // Daniel
                    ImageS3Key = "event-images/503/SQL-for-Data-Analysis.webp",
                    Description =
@"Analysts learn joins and aggregations long before they learn to think in windows, yet ranking, running totals, and cohort-aware metrics are what make dashboards explain patterns rather than count rows. This workshop demystifies window functions through a tidy dataset and a progression that emphasises framing over memorisation. We map plain-language questions to partitions, orders, and frames—top N within category, share of category, current versus rolling average, and first/last values for retention narratives. 

Participants then implement ROW_NUMBER, RANK, DENSE_RANK, SUM() OVER, and AVG() OVER with careful attention to PARTITION BY, ORDER BY, and frame clauses. Common pitfalls—NULL handling, inconsistent ordering keys, and accidental cross-partition leakage—are unpacked with checks that catch them early. We close with performance and readability tips: where to pre-aggregate, when to materialise, and how to comment intent so the next analyst trusts what they inherit. You’ll leave with confidence, not just syntax, plus a one-page cheat sheet for future reference."
                },
                new Event {
                    Id = a504,
                    Title = "Grad School Q&A — CS/AI Pathways",
                    StartAt = UtcOn(y, 11, 15, 18),
                    EndAt   = UtcOn(y, 11, 15, 19),
                    Location = "Sir Owen G Glenn Building, Level 0, OGGB4 Lecture Theatre",
                    Category = "Academic", Capacity = 80, OrganizerId = org8, // Ziyun
                    ImageS3Key = "event-images/504/grad q&a.jpg",
                    Description =
@"A candid Q&A with current postgraduates about choosing supervisors, scoping proposals, and navigating funding. We discuss realistic timelines, the rhythm of coursework versus research, and decision points that commonly shift plans. Attendees learn what a week actually looks like in different labs, how reading groups work, and what to do when interests change mid-stream. The panel also shares tactics for writing statements that reflect fit and curiosity without grand claims. 

The conversation aims to reduce uncertainty and improve questions you ask potential supervisors. We touch briefly on application logistics—references, transcripts, and deadlines—then focus on the human side of postgraduate study: feedback culture, collaboration, and self-care during longer projects. Bring questions; the goal is useful detail rather than marketing."
                },

                // ----- NEW -----
                new Event {
                    Id = a505,
                    Title = "Introduction to Human–Computer Interaction: Principles, Applications, and Future Directions",
                    StartAt = UtcOn(y, 11, 21, 16),
                    EndAt   = UtcOn(y, 11, 21, 17, 30),
                    Location = "Auckland Law School, 9 Eden Crescent, Auckland Central, Auckland 1010",
                    Category = "Academic", Capacity = 80, OrganizerId = org7, // Asma Shakil
                    ImageS3Key = "event-images/505/edge ai.png",
                    Description =
@"Human–Computer Interaction (HCI) studies how people use, understand, and experience interactive technology—and how we can design systems that are effective, efficient, and enjoyable. This introductory lecture maps the core questions HCI asks, the methods it uses, and the kinds of impact it delivers. We begin with the foundations: usability, feedback, mental models, affordances, constraints, and error tolerance. Short demos show how small interface choices change comprehension and confidence, and why good defaults and clear recoveries matter as much as features.

We then survey HCI’s toolkit: contextual inquiry, interviews, surveys, task analysis, low‑ and high‑fidelity prototyping, formative and summative usability testing, and basic instrumentation for learning from real use. You will see how these methods fit into rapid build cycles common in student projects and start‑ups.

The lecture highlights application areas shaping the next decade—education platforms, digital health, productivity tools, transportation, AR/VR, conversational agents, and AI‑assisted interfaces—emphasising where HCI adds distinctive value alongside computer science and design. We discuss how to reason about attention, cognitive load, accessibility basics, and trustworthy communication when products must operate in noisy, time‑pressed contexts.

We close with a look at study and career pathways: the skills teams look for, example project scopes for coursework and capstones, and practical ways to build a small but credible HCI portfolio. Attendees will leave with a plain‑English vocabulary for discussing interfaces, a sense of where HCI is heading, and a short checklist they can immediately apply to their own prototypes and research ideas."
                },
            };
            context.Events.AddRange(events);
            context.SaveChanges();

            // ---------- Agendas (now includes the new a505) ----------
            var agendaTargets = new[] { 101,102,103,104,105,201,202,203,204,301,302,303,304,401,402,503,505 };
            var agendaMap = context.Events
                .Where(e => agendaTargets.Contains(e.Id))
                .ToDictionary(e => e.Id, e => DateTime.SpecifyKind(e.StartAt, DateTimeKind.Utc));

            DateTime S(int id, int m) => agendaMap[id].AddMinutes(m);
            DateTime E(int id, int m) => agendaMap[id].AddMinutes(m);

            var agendas = new List<AgendaItem>
            {
                // (unchanged agendas for prior 15 events)...
                new AgendaItem{ EventId = 101, Order = 1, Title = "Check-in & Environment Sanity", Description = "USB, drivers, repo clone, and baseline benchmarks confirmed before instruction begins.", StartAt = S(101, 0), EndAt = E(101, 10) },
                new AgendaItem{ EventId = 101, Order = 2, Title = "Quantization Primer",          Description = "Accuracy–latency trade-offs, calibration pitfalls, and device kernel compatibility considerations.", StartAt = S(101, 10), EndAt = E(101, 35) },
                new AgendaItem{ EventId = 101, Order = 3, Title = "Hands-on On-Device Demo",      Description = "Run int8 model, compare to float, record FPS, memory, utilisation, and temperatures.", StartAt = S(101, 35), EndAt = E(101, 80) },
                new AgendaItem{ EventId = 101, Order = 4, Title = "Debrief & Demo Checklist",      Description = "Telemetry, seeds, offline artefacts, and rollback plan for reliable presentations next week.", StartAt = S(101, 80), EndAt = E(101, 90) },

                new AgendaItem{ EventId = 102, Order = 1, Title = "Orientation & Goals",           Description = "Deployments, Jobs, Services overview; what problems each solves in student projects.", StartAt = S(102, 0), EndAt = E(102, 10) },
                new AgendaItem{ EventId = 102, Order = 2, Title = "Containerise and Push",         Description = "Build image locally, tag appropriately, push to registry, verify image availability.", StartAt = S(102, 10), EndAt = E(102, 35) },
                new AgendaItem{ EventId = 102, Order = 3, Title = "Deploy & Update Safely",        Description = "Rolling updates, environment variables, ConfigMaps, Secrets, and resource requests basics.", StartAt = S(102, 35), EndAt = E(102, 70) },
                new AgendaItem{ EventId = 102, Order = 4, Title = "Troubleshooting Clinic",        Description = "Diagnose image pulls, CrashLoopBackOffs, and networking issues using repeatable commands.", StartAt = S(102, 70), EndAt = E(102, 90) },

                new AgendaItem{ EventId = 103, Order = 1, Title = "Tokens, Type, and Spacing",     Description = "Map type scales and spacing ramps to Grid and Flex layouts faithfully.", StartAt = S(103, 0), EndAt = E(103, 25) },
                new AgendaItem{ EventId = 103, Order = 2, Title = "Rebuild a Screen",              Description = "Convert auto-layout to resilient components with accessible states and breakpoints.", StartAt = S(103, 25), EndAt = E(103, 75) },
                new AgendaItem{ EventId = 103, Order = 3, Title = "Audit & Handoff Template",      Description = "Compare builds, note pitfalls, define props, states, and acceptance criteria clearly.", StartAt = S(103, 75), EndAt = E(103, 90) },

                new AgendaItem{ EventId = 104, Order = 1, Title = "Read the API",                 Description = "Parse Swagger, pick headers, pagination, and friendly rate-limit back-off strategy.", StartAt = S(104, 0), EndAt = E(104, 15) },
                new AgendaItem{ EventId = 104, Order = 2, Title = "Clean & Transform",            Description = "Tidy responses, annotate gaps, write tests for robust transforms across semesters.", StartAt = S(104, 15), EndAt = E(104, 60) },
                new AgendaItem{ EventId = 104, Order = 3, Title = "Build the Dashboard",          Description = "Implement loading, empty, error states, with micro-caching for responsive feel.", StartAt = S(104, 60), EndAt = E(104, 105) },
                new AgendaItem{ EventId = 104, Order = 4, Title = "Ethics & Handover",            Description = "Document lineage, limits, and reuse guidance so classmates can extend responsibly.", StartAt = S(104, 105), EndAt = E(104, 120) },

                new AgendaItem{ EventId = 105, Order = 1, Title = "Welcome & Overview",                  Description = "Why CEMS; what problems it solves; today’s flow and outcomes.",                         StartAt = S(105, 0),   EndAt = E(105, 15)  },
                new AgendaItem{ EventId = 105, Order = 2, Title = "Live Demo: Student & Organizer",      Description = "Browse and register events; create/edit events; manage attendees in real time.",       StartAt = S(105, 15),  EndAt = E(105, 60)  },
                new AgendaItem{ EventId = 105, Order = 3, Title = "Hands-On Session (+ short break)",    Description = "Guided onboarding on attendees’ laptops; helpers available; brief snack break inside.", StartAt = S(105, 60),  EndAt = E(105, 135) },
                new AgendaItem{ EventId = 105, Order = 4, Title = "Q&A, Feedback & Next Steps",          Description = "Open questions; collect feedback; early-adopter sign-ups and follow-up links.",         StartAt = S(105, 135), EndAt = E(105, 180) },

                new AgendaItem{ EventId = 201, Order = 1, Title = "Lightning Talks",              Description = "Hover, focus, press patterns; timing that clarifies content rather than distracts.", StartAt = S(201, 0), EndAt = E(201, 20) },
                new AgendaItem{ EventId = 201, Order = 2, Title = "Team Jam & Test",              Description = "Design micro-interactions for signup and search, test quickly with peers present.", StartAt = S(201, 20), EndAt = E(201, 70) },
                new AgendaItem{ EventId = 201, Order = 3, Title = "Critique & Library",           Description = "Capture do/don’t notes and examples for reuse in future coursework submissions.", StartAt = S(201, 70), EndAt = E(201, 90) },

                new AgendaItem{ EventId = 202, Order = 1, Title = "Route & Safety Briefing",      Description = "Visibility, shared-path etiquette, and low-light camera settings overview.", StartAt = S(202, 0), EndAt = E(202, 10) },
                new AgendaItem{ EventId = 202, Order = 2, Title = "ClockTower Frames",            Description = "Practice leading lines and layering; capture silhouettes during golden hour.", StartAt = S(202, 10), EndAt = E(202, 40) },
                new AgendaItem{ EventId = 202, Order = 3, Title = "Symonds Street Façades",       Description = "Manage reflections and noise; experiment with handheld slower shutter speeds.", StartAt = S(202, 40), EndAt = E(202, 80) },
                new AgendaItem{ EventId = 202, Order = 4, Title = "Review & Quick Edits",         Description = "Crop, straighten, gentle colour adjustments; respectful sharing and feedback.", StartAt = S(202, 80), EndAt = E(202, 120) },

                new AgendaItem{ EventId = 203, Order = 1, Title = "Sketch & Decide",              Description = "Produce three divergent sketches, critique quickly, converge on the strongest direction.", StartAt = S(203, 0), EndAt = E(203, 25) },
                new AgendaItem{ EventId = 203, Order = 2, Title = "Build Tappable Prototype",     Description = "Link hotspots; define empty, loading, success, and error content states clearly.", StartAt = S(203, 25), EndAt = E(203, 75) },
                new AgendaItem{ EventId = 203, Order = 3, Title = "Hallway Tests & Notes",        Description = "Observe confusion, log quick fixes, capture evidence to support design decisions.", StartAt = S(203, 75), EndAt = E(203, 90) },

                new AgendaItem{ EventId = 204, Order = 1, Title = "Brief & Audience",             Description = "Clarify must-know details and audience; choose type pairing and hierarchy rhythm.", StartAt = S(204, 0), EndAt = E(204, 15) },
                new AgendaItem{ EventId = 204, Order = 2, Title = "Layout & Assets",              Description = "Establish contrast through size, spacing; prepare imagery with appropriate rights.", StartAt = S(204, 15), EndAt = E(204, 60) },
                new AgendaItem{ EventId = 204, Order = 3, Title = "Export & Checklist",           Description = "Export print and social variants; approvals, file naming, and QR reliability.", StartAt = S(204, 60), EndAt = E(204, 90) },

                new AgendaItem{ EventId = 301, Order = 1, Title = "Warm-up & Court Split",        Description = "Mobility sequence, safety reminders, partner rotation plan explained clearly.", StartAt = S(301, 0), EndAt = E(301, 15) },
                new AgendaItem{ EventId = 301, Order = 2, Title = "Coached Drills",               Description = "Serve consistency and controlled returns; quick tips to lengthen rallies progressively.", StartAt = S(301, 15), EndAt = E(301, 45) },
                new AgendaItem{ EventId = 301, Order = 3, Title = "Rotating Doubles Games",       Description = "Fifteen-minute games, winners move courts; ensure inclusive, friendly competition.", StartAt = S(301, 45), EndAt = E(301, 115) },
                new AgendaItem{ EventId = 301, Order = 4, Title = "Cool-down & Wrap",             Description = "Light stretches, hydration, equipment return, and sign-ups for future sessions discussed.", StartAt = S(301, 115), EndAt = E(301, 120) },

                new AgendaItem{ EventId = 302, Order = 1, Title = "Route Briefing",               Description = "Pacer groups, passing etiquette, visibility guidance for shared paths at dusk.", StartAt = S(302, 0), EndAt = E(302, 5) },
                new AgendaItem{ EventId = 302, Order = 2, Title = "5K Loop with Pacers",          Description = "Conversational pace along Grafton Gully; regroup points ensure nobody finishes alone.", StartAt = S(302, 5), EndAt = E(302, 55) },
                new AgendaItem{ EventId = 302, Order = 3, Title = "Mobility & Recovery",          Description = "Brief stretches and tips to minimise soreness before tomorrow’s labs and study.", StartAt = S(302, 55), EndAt = E(302, 60) },

                new AgendaItem{ EventId = 303, Order = 1, Title = "Fundamentals Clinic",          Description = "Grip, stance, basic footwork demonstrated; safety and shared-court etiquette covered.", StartAt = S(303, 0), EndAt = E(303, 15) },
                new AgendaItem{ EventId = 303, Order = 2, Title = "Targeted Drills",              Description = "Serve, return, and placement drills; guidance tailored to beginners’ confidence levels.", StartAt = S(303, 15), EndAt = E(303, 50) },
                new AgendaItem{ EventId = 303, Order = 3, Title = "Short Games & Coaching",       Description = "Paired by level; coaches provide cues for spin reading and recovery positioning.", StartAt = S(303, 50), EndAt = E(303, 90) },

                new AgendaItem{ EventId = 304, Order = 1, Title = "Dynamic Warm-up",              Description = "Movement prep, communication cues, and agreement on friendly game rules shared.", StartAt = S(304, 0), EndAt = E(304, 10) },
                new AgendaItem{ EventId = 304, Order = 2, Title = "4-on-4 Pickup Games",          Description = "Rolling substitutions maintain pace; bring dark and light tops for quick swaps.", StartAt = S(304, 10), EndAt = E(304, 110) },
                new AgendaItem{ EventId = 304, Order = 3, Title = "Cool-down & Court Tidy",       Description = "Light stretching, hydration, and quick cleanup to prepare court for next group.", StartAt = S(304, 110), EndAt = E(304, 120) },

                new AgendaItem{ EventId = 401, Order = 1, Title = "Breath Reset",                 Description = "Box breathing and cadence drills to settle nerves before longer study sessions.", StartAt = S(401, 0), EndAt = E(401, 10) },
                new AgendaItem{ EventId = 401, Order = 2, Title = "Desk Mobility",                Description = "Gentle neck, shoulder, and back work suitable for everyday clothes and labs.", StartAt = S(401, 10), EndAt = E(401, 35) },
                new AgendaItem{ EventId = 401, Order = 3, Title = "Take-home Routine",            Description = "Review five-minute sequence and small habits to sustain comfort during exams.", StartAt = S(401, 35), EndAt = E(401, 45) },

                new AgendaItem{ EventId = 402, Order = 1, Title = "Sleep Anchors",                Description = "Light exposure, timing, and environment strategies stabilising sleep under pressure.", StartAt = S(402, 0), EndAt = E(402, 20) },
                new AgendaItem{ EventId = 402, Order = 2, Title = "Focus Playbook",               Description = "Caffeine timing, restorative naps, and digital hygiene supporting deep work.", StartAt = S(402, 20), EndAt = E(402, 45) },
                new AgendaItem{ EventId = 402, Order = 3, Title = "Q&A and Personalisation",      Description = "Adapt schedules to course loads; troubleshoot common barriers in shared flats.", StartAt = S(402, 45), EndAt = E(402, 60) },

                new AgendaItem{ EventId = 503, Order = 1, Title = "Frame Questions",              Description = "Translate plain questions into partitions, orders, and window frames accurately.", StartAt = S(503, 0), EndAt = E(503, 20) },
                new AgendaItem{ EventId = 503, Order = 2, Title = "Ranking Functions",            Description = "ROW_NUMBER, RANK, DENSE_RANK with careful ordering keys and tie behaviour.", StartAt = S(503, 20), EndAt = E(503, 50) },
                new AgendaItem{ EventId = 503, Order = 3, Title = "Cumulative Metrics",           Description = "SUM() OVER, AVG() OVER; rolling windows; detect and prevent partition leakage.", StartAt = S(503, 50), EndAt = E(503, 85) },
                new AgendaItem{ EventId = 503, Order = 4, Title = "Performance & Readability",    Description = "Pre-aggregate where helpful; materialise wisely; comment intent for teammates.", StartAt = S(503, 85), EndAt = E(503, 90) },

                // New lecture a505 — 4 items (10–20 words each)
                new AgendaItem{ EventId = 505, Order = 1, Title = "What is HCI?",                 Description = "Scope, goals, and why interface decisions change outcomes.", StartAt = S(505, 0), EndAt = E(505, 15) },
                new AgendaItem{ EventId = 505, Order = 2, Title = "Core Principles & Methods",    Description = "Usability, feedback, prototyping, and testing within fast build cycles.", StartAt = S(505, 15), EndAt = E(505, 55) },
                new AgendaItem{ EventId = 505, Order = 3, Title = "Applications & Case Snapshots", Description = "Education, health, productivity, AR/VR, and AI‑assisted interfaces.", StartAt = S(505, 55), EndAt = E(505, 80) },
                new AgendaItem{ EventId = 505, Order = 4, Title = "Pathways & Next Steps",        Description = "Study routes, portfolio ideas, and a checklist for prototypes.", StartAt = S(505, 80), EndAt = E(505, 90) },
            };
            context.AgendaItems.AddRange(agendas);
            context.SaveChanges();

            // ---------- Bulk Registrations ----------
            var eventById = context.Events.ToDictionary(e => e.Id);
            int Cap(int eid) => eventById[eid].Capacity;

            var allEventIds = new[]
            {
                // Technology
                t101, t102, t103, t104,
                // Creative
                c201, c202, c203, c204,
                // Sports
                s301, s302, s303, s304,
                // Wellness
                w401, w402, w403, w404, w405,
                // Academic
                a501, a502, a503, a504, a505
            };

            var studentIds = Enumerable.Range(101, 20).ToList(); // 101–120

            var rng = new Random(2025_11_03); // deterministic but different from previous seed
            List<int> PickStudentsForEvent(int targetCount) =>
                studentIds.OrderBy(_ => rng.Next()).Take(Math.Max(0, Math.Min(targetCount, studentIds.Count))).ToList();

            DateTime RandomRegisteredAtUtc()
            {
                var daysAgo = rng.Next(2, 11);         // 2–10 days ago
                var minutesAgo = rng.Next(0, 600);     // up to 10 hours
                return DateTime.UtcNow.AddDays(-daysAgo).AddMinutes(-minutesAgo);
            }

            var bulkRegs = new List<EventRegistration>();

            foreach (var eid in allEventIds)
            {
                var cap = Cap(eid);
                int target;

                if (eid == s301 || eid == a503 || eid == t101 || eid == a505)
                    target = Math.Min(cap, (int)(cap * 0.9));     // make a few hot
                else if (eid == c201 || eid == w401)
                    target = Math.Min(cap, (int)(cap * 0.7));
                else
                    target = Math.Min(cap, rng.Next(10, Math.Min(cap, 24)));

                foreach (var sid in PickStudentsForEvent(target))
                {
                    bool already = context.EventRegistrations.Any(r => r.EventId == eid && r.UserId == sid)
                                   || bulkRegs.Any(r => r.EventId == eid && r.UserId == sid);
                    if (already) continue;

                    bulkRegs.Add(new EventRegistration
                    {
                        EventId = eid,
                        UserId = sid,
                        RegisteredAt = RandomRegisteredAtUtc()
                    });
                }
            }

            void AddLateBurst(int eid, int extra)
            {
                var available = studentIds
                    .Where(sid => !context.EventRegistrations.Any(r => r.EventId == eid && r.UserId == sid)
                                  && !bulkRegs.Any(r => r.EventId == eid && r.UserId == sid))
                    .OrderBy(_ => rng.Next())
                    .Take(extra)
                    .ToList();

                foreach (var sid in available)
                {
                    int current = bulkRegs.Count(r => r.EventId == eid) + context.EventRegistrations.Count(r => r.EventId == eid);
                    if (current >= Cap(eid)) break;

                    bulkRegs.Add(new EventRegistration
                    {
                        EventId = eid,
                        UserId = sid,
                        RegisteredAt = DateTime.UtcNow.AddHours(-rng.Next(2, 12))
                    });
                }
            }

            // bump interest
            AddLateBurst(t101, 6);
            AddLateBurst(a503, 6);
            AddLateBurst(s301, 6);
            AddLateBurst(a505, 8);

            context.EventRegistrations.AddRange(bulkRegs);
            context.SaveChanges();
            
            // ✅ 重置 Events 序列
            context.Database.ExecuteSqlRaw(@"
        SELECT setval(
            pg_get_serial_sequence('""Events""', 'Id'),
            (SELECT MAX(""Id"") FROM ""Events""),
            true
        );
    ");
        }
    }
}
