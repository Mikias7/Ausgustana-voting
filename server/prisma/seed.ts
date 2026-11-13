/**
 * Development seed — FAKE data only. Wipes every table, then inserts a small
 * campus: two organizations, a dozen students, admins, and elections in every
 * phase relative to "now".  Run with `npm run db:seed` (from server/).
 */
import "dotenv/config";
import { PrismaClient, type ClassStanding, type Prisma } from "@prisma/client";
import type { EligibilityRule } from "@asa/shared";
import { generateReceiptCode, hashReceiptCode } from "../src/utils/receipt";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV=production. The seed wipes the database.");
  process.exit(1);
}

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysFromNow = (days: number) => new Date(now + days * DAY);

const ALL: EligibilityRule = { type: "ALL_STUDENTS" };
const only = (...classes: ClassStanding[]): EligibilityRule => ({ type: "CLASS_STANDING", classes });

// ---------------------------------------------------------------------------

async function wipe() {
  // Children before parents (most relations are onDelete: Restrict).
  await prisma.ballotSelection.deleteMany();
  await prisma.ballot.deleteMany();
  await prisma.voterParticipation.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.position.deleteMany();
  await prisma.election.deleteMany();
  await prisma.voterListMember.deleteMany();
  await prisma.voterList.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.organizationRole.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.user.updateMany({ data: { lastImportId: null } });
  await prisma.studentImport.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
}

const STUDENT_NAMES: Record<ClassStanding, [string, string][]> = {
  FR: [["Avery", "Lindqvist"], ["Jordan", "Haugen"], ["Mia", "Okafor"]],
  SO: [["Noah", "Sorensen"], ["Priya", "Raman"], ["Elijah", "Brandt"]],
  JR: [["Sofia", "Martinez"], ["Liam", "Nygaard"], ["Hannah", "Kowalski"]],
  SR: [["Ethan", "Berg"], ["Grace", "Thompson"], ["Lucas", "Amundson"]],
};

async function seedUsers() {
  const students: Record<string, string> = {}; // username → id

  for (const [cls, names] of Object.entries(STUDENT_NAMES) as [ClassStanding, [string, string][]][]) {
    for (const [i, [firstName, lastName]] of names.entries()) {
      const username = `${cls.toLowerCase()}.student${i + 1}`;
      const user = await prisma.user.create({
        data: { username, email: `${username}@ole.augie.edu`, firstName, lastName, classStanding: cls, onRoster: true },
      });
      students[username] = user.id;
    }
  }

  // A graduated student: kept for history, no longer eligible.
  const former = await prisma.user.create({
    data: {
      username: "sr.former1",
      email: "sr.former1@ole.augie.edu",
      firstName: "Olivia",
      lastName: "Johansen",
      classStanding: "SR",
      onRoster: false,
    },
  });
  students[former.username] = former.id;

  const platformAdmin = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@augustana.edu",
      firstName: "Platform",
      lastName: "Administrator",
      platformRole: "PLATFORM_ADMIN",
    },
  });

  const asaAdmin = await prisma.user.create({
    data: { username: "asa.advisor", email: "asa.advisor@augustana.edu", firstName: "Dana", lastName: "Larson" },
  });

  return { students, platformAdmin, asaAdmin };
}

interface PositionSeed {
  title: string;
  description?: string;
  eligibility: EligibilityRule;
  seats?: number;
  votingMethod?: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  maxSelections?: number;
  allowWriteIn?: boolean;
  candidates: { name: string; bio?: string; username?: string }[];
}

type ElectionSeed = Omit<Prisma.ElectionUncheckedCreateInput, "eligibility" | "positions"> & {
  eligibility: EligibilityRule;
  positions: PositionSeed[];
};

async function createElection(seed: ElectionSeed, students: Record<string, string>) {
  const { positions, ...data } = seed;
  return prisma.election.create({
    data: {
      ...data,
      positions: {
        create: positions.map((p, index) => ({
          title: p.title,
          description: p.description,
          eligibility: p.eligibility,
          seats: p.seats ?? 1,
          votingMethod: p.votingMethod ?? "SINGLE_CHOICE",
          maxSelections: p.maxSelections ?? 1,
          allowWriteIn: p.allowWriteIn ?? false,
          sortOrder: index,
          candidates: {
            create: p.candidates.map((c, cIndex) => ({
              name: c.name,
              bio: c.bio,
              userId: c.username ? students[c.username] : undefined,
              sortOrder: cIndex,
            })),
          },
        })),
      },
    },
    include: { positions: { include: { candidates: true }, orderBy: { sortOrder: "asc" } } },
  });
}

type SeededElection = Awaited<ReturnType<typeof createElection>>;

/**
 * Records votes with the same privacy structure as the real voting service:
 * participations (who) and ballots (what) are written separately, ballots in
 * shuffled order, with no link and no timestamp on the ballot.
 * `choices[i]` lists candidate indexes for position i: [] = abstain,
 * null = position not on this voter's ballot (not eligible).
 */
async function castVotes(election: SeededElection, votes: { username: string; choices: (number[] | null)[] }[], students: Record<string, string>) {
  await prisma.voterParticipation.createMany({
    data: votes.map((v, i) => ({
      electionId: election.id,
      userId: students[v.username]!,
      votedAt: new Date(Math.min(election.endsAt.getTime(), election.startsAt.getTime() + (i + 1) * 3_600_000)),
    })),
  });

  const shuffled = [...votes].sort(() => Math.random() - 0.5);
  for (const vote of shuffled) {
    await prisma.ballot.create({
      data: {
        electionId: election.id,
        receiptHash: hashReceiptCode(generateReceiptCode()),
        selections: {
          create: election.positions.flatMap((position, pIndex): Prisma.BallotSelectionUncheckedCreateWithoutBallotInput[] => {
            const picks = vote.choices[pIndex] ?? null;
            if (picks === null) return [];
            if (picks.length === 0) return [{ positionId: position.id, abstain: true }];
            return picks.map((c) => ({ positionId: position.id, candidateId: position.candidates[c]!.id }));
          }),
        },
      },
    });
  }
}

async function main() {
  await wipe();
  const { students, platformAdmin, asaAdmin } = await seedUsers();

  const asa = await prisma.organization.create({
    data: {
      name: "Augustana Student Association",
      slug: "asa",
      description: "The student government of Augustana University, representing every undergraduate student.",
      contactEmail: "asa@augustana.edu",
    },
  });
  const outdoors = await prisma.organization.create({
    data: {
      name: "Augustana Outdoors Club",
      slug: "outdoors-club",
      description: "Hiking, paddling and camping trips around the Sioux Falls area.",
      contactEmail: "outdoors@augustana.edu",
    },
  });

  await prisma.organizationRole.createMany({
    data: [
      { organizationId: asa.id, userId: asaAdmin.id, role: "ELECTION_ADMIN" },
      { organizationId: outdoors.id, userId: students["sr.student1"]!, role: "ORG_ADMIN" },
    ],
  });

  const internationalList = await prisma.voterList.create({
    data: {
      name: "International Students",
      organizationId: asa.id,
      members: { create: [{ username: "so.student2" }, { username: "jr.student1" }, { username: "fr.student3" }] },
    },
  });

  const asaDefaults = { organizationId: asa.id, createdById: asaAdmin.id };

  // OPEN — the main election to develop the ballot against.
  const senate = await createElection(
    {
      ...asaDefaults,
      title: "ASA Senate Fall 2026",
      description: "Elect your class senators and two at-large senators for the 2026–27 academic year.",
      status: "PUBLISHED",
      startsAt: daysFromNow(-2),
      endsAt: daysFromNow(5),
      eligibility: ALL,
      resultsVisibility: "STUDENTS",
      resultsRelease: "MANUAL",
      positions: [
        { title: "Freshman Senator", eligibility: only("FR"), candidates: [{ name: "Avery Lindqvist", username: "fr.student1", bio: "Wants longer library hours during finals week." }, { name: "Jordan Haugen", username: "fr.student2", bio: "Focused on first-year orientation and mentoring." }] },
        { title: "Sophomore Senator", eligibility: only("SO"), candidates: [{ name: "Noah Sorensen", username: "so.student1", bio: "Pushing for more late-night dining options." }, { name: "Elijah Brandt", username: "so.student3", bio: "Advocate for intramural sports funding." }] },
        { title: "Junior Senator", eligibility: only("JR"), candidates: [{ name: "Sofia Martinez", username: "jr.student1", bio: "Study-abroad ambassador and peer tutor." }, { name: "Hannah Kowalski", username: "jr.student3", bio: "Wants a campus-wide sustainability plan." }] },
        { title: "Senior Senator", eligibility: only("SR"), candidates: [{ name: "Grace Thompson", username: "sr.student2", bio: "Career-services liaison for graduating seniors." }, { name: "Lucas Amundson", username: "sr.student3", bio: "Three years on the ASA finance committee." }] },
        {
          title: "At-Large Senator",
          description: "Two seats. Vote for up to two candidates.",
          eligibility: ALL,
          seats: 2,
          votingMethod: "MULTIPLE_CHOICE",
          maxSelections: 2,
          allowWriteIn: true,
          candidates: [
            { name: "Mia Okafor", username: "fr.student3", bio: "Commuter-student representative." },
            { name: "Priya Raman", username: "so.student2", bio: "International Student Association member." },
            { name: "Liam Nygaard", username: "jr.student2", bio: "Residence hall council president." },
            { name: "Ethan Berg", username: "sr.student1", bio: "Outdoors Club president." },
          ],
        },
        {
          title: "International Senator",
          eligibility: { type: "VOTER_LIST", listId: internationalList.id },
          candidates: [{ name: "Priya Raman", username: "so.student2" }, { name: "Sofia Martinez", username: "jr.student1" }],
        },
      ],
    },
    students,
  );
  // A few students have already voted (choices per position, in position order).
  await castVotes(senate, [
    { username: "fr.student1", choices: [[0], null, null, null, [0, 2], null] },
    { username: "so.student1", choices: [null, [0], null, null, [1, 3], null] },
    { username: "sr.student2", choices: [null, null, null, [0], [2], null] },
  ], students);

  // UPCOMING
  await createElection(
    {
      ...asaDefaults,
      title: "ASA Executive Board Spring 2027",
      description: "Choose next year's ASA President, Vice President and Treasurer.",
      status: "PUBLISHED",
      startsAt: daysFromNow(10),
      endsAt: daysFromNow(14),
      eligibility: ALL,
      resultsVisibility: "PUBLIC",
      resultsRelease: "AUTOMATIC",
      positions: [
        { title: "President", eligibility: ALL, candidates: [{ name: "Grace Thompson", username: "sr.student2" }, { name: "Liam Nygaard", username: "jr.student2" }] },
        { title: "Vice President", eligibility: ALL, candidates: [{ name: "Sofia Martinez", username: "jr.student1" }, { name: "Noah Sorensen", username: "so.student1" }] },
        { title: "Treasurer", eligibility: ALL, allowWriteIn: true, candidates: [{ name: "Lucas Amundson", username: "sr.student3" }] },
      ],
    },
    students,
  );

  // CLOSED, results published.
  const spring = await createElection(
    {
      ...asaDefaults,
      title: "ASA Spring 2026 General Election",
      description: "Election of the 2026–27 ASA President and Vice President.",
      status: "PUBLISHED",
      startsAt: daysFromNow(-200),
      endsAt: daysFromNow(-193),
      eligibility: ALL,
      resultsVisibility: "PUBLIC",
      resultsRelease: "MANUAL",
      resultsPublishedAt: daysFromNow(-192),
      positions: [
        { title: "President", eligibility: ALL, candidates: [{ name: "Ethan Berg", username: "sr.student1" }, { name: "Hannah Kowalski", username: "jr.student3" }] },
        { title: "Vice President", eligibility: ALL, candidates: [{ name: "Grace Thompson", username: "sr.student2" }, { name: "Elijah Brandt", username: "so.student3" }] },
      ],
    },
    students,
  );
  await castVotes(spring, [
    { username: "fr.student2", choices: [[0], [0]] },
    { username: "so.student1", choices: [[0], [1]] },
    { username: "so.student2", choices: [[1], [0]] },
    { username: "jr.student1", choices: [[0], [0]] },
    { username: "jr.student2", choices: [[1], []] },
    { username: "jr.student3", choices: [[1], [0]] },
    { username: "sr.student1", choices: [[0], [0]] },
    { username: "sr.student3", choices: [[0], [1]] },
    { username: "sr.former1", choices: [[1], [0]] },
  ], students);

  // DRAFT — never visible on public endpoints.
  await createElection(
    {
      ...asaDefaults,
      title: "ASA Constitutional Amendment Referendum",
      description: "Draft: proposed changes to the ASA constitution.",
      status: "DRAFT",
      startsAt: daysFromNow(30),
      endsAt: daysFromNow(32),
      eligibility: ALL,
      positions: [{ title: "Approve the amendment?", eligibility: ALL, candidates: [{ name: "Yes" }, { name: "No" }] }],
    },
    students,
  );

  // Club election, OPEN, juniors and seniors only, admin-only results.
  await createElection(
    {
      organizationId: outdoors.id,
      createdById: students["sr.student1"]!,
      title: "Outdoors Club Officers 2026–27",
      description: "Pick the club's trip coordinator.",
      status: "PUBLISHED",
      startsAt: daysFromNow(-1),
      endsAt: daysFromNow(3),
      eligibility: only("JR", "SR"),
      resultsVisibility: "ADMINS_ONLY",
      resultsRelease: "MANUAL",
      showTurnout: false,
      positions: [
        { title: "Trip Coordinator", eligibility: ALL, candidates: [{ name: "Liam Nygaard", username: "jr.student2" }, { name: "Lucas Amundson", username: "sr.student3" }] },
      ],
    },
    students,
  );

  await prisma.announcement.createMany({
    data: [
      {
        organizationId: asa.id,
        title: "Senate voting is open",
        body: "Voting for the ASA Senate Fall 2026 election is open now. Sign in and cast your ballot before the deadline.",
        publishedAt: daysFromNow(-2),
      },
      {
        organizationId: null,
        title: "Welcome to the new voting platform",
        body: "All student elections at Augustana now run here. Questions? Use the contact page.",
        publishedAt: daysFromNow(-20),
      },
      {
        organizationId: asa.id,
        title: "Executive board candidate forum (draft)",
        body: "Unpublished announcement: should not appear publicly.",
        publishedAt: null,
      },
    ],
  });

  await prisma.auditLog.create({
    data: { actorId: platformAdmin.id, action: "DATABASE_SEEDED", entityType: "System", metadata: { note: "Development seed" } },
  });

  const counts = {
    users: await prisma.user.count(),
    elections: await prisma.election.count(),
    ballots: await prisma.ballot.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
