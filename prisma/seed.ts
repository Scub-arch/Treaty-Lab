// Seed for the Treaty Archive section.
// Populates Treaty / Party / Signature / Topic tables with a curated set of
// Numbered Treaties (Canadian Indigenous) and key international instruments.
//
// Run with: npx prisma db seed   (or `npx tsx prisma/seed.ts`)

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbPath = dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl;

const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

interface SeedTreaty {
  slug: string;
  name: string;
  shortName?: string;
  openedAt: string; // ISO
  enteredIntoForceAt?: string;
  depository?: string;
  summary: string;
  fullText: string;
  sourceUrl?: string;
  topicSlugs: string[];
  signatories: { partyCode: string; signedAt?: string; ratifiedAt?: string; reservation?: string }[];
}

const TOPICS: { slug: string; name: string }[] = [
  { slug: "indigenous-rights", name: "Indigenous rights" },
  { slug: "numbered-treaty", name: "Canadian Numbered Treaty" },
  { slug: "self-determination", name: "Self-determination" },
  { slug: "land-and-resources", name: "Land and resources" },
  { slug: "humanitarian-law", name: "Humanitarian law" },
  { slug: "environment-climate", name: "Environment and climate" },
  { slug: "international-organisations", name: "International organisations" },
  { slug: "law-of-treaties", name: "Law of treaties" },
  { slug: "labour-rights", name: "Labour rights" },
];

const PARTIES: { code: string; name: string; type: "country" | "organization" }[] = [
  { code: "CA-CROWN", name: "Crown in Right of Canada", type: "organization" },
  { code: "CA", name: "Canada", type: "country" },
  { code: "PLAINS-CREE", name: "Plains Cree (signatories to Treaty 6)", type: "organization" },
  { code: "WOODS-CREE", name: "Woods Cree (signatories to Treaty 6)", type: "organization" },
  { code: "BLACKFOOT-CONFEDERACY", name: "Blackfoot Confederacy (Treaty 7 signatories: Siksika, Kainai, Piikani)", type: "organization" },
  { code: "STONEY-NAKODA", name: "Stoney Nakoda (Treaty 7 signatory)", type: "organization" },
  { code: "TSUUT-INA", name: "Tsuut'ina Nation (Treaty 7 signatory)", type: "organization" },
  { code: "BEAVER", name: "Beaver / Dane-zaa (Treaty 8 signatories)", type: "organization" },
  { code: "CHIPEWYAN", name: "Chipewyan / Denesųłiné (Treaty 8 signatories)", type: "organization" },
  { code: "DENE-TREATY11", name: "Dene Nations (Treaty 11 signatories: Sahtu, Dehcho, Gwich'in)", type: "organization" },
  { code: "ANISHINAABE-T1", name: "Anishinaabe and Swampy Cree (Treaty 1 signatories)", type: "organization" },
  { code: "CREE-SAULTEAUX-T4", name: "Cree and Saulteaux (Treaty 4 signatories)", type: "organization" },
  { code: "UN-GA", name: "United Nations General Assembly", type: "organization" },
  { code: "UN-MEMBER-STATES", name: "UN Member States (as parties to UN Charter)", type: "organization" },
  { code: "ILO", name: "International Labour Organization", type: "organization" },
];

const TREATIES: SeedTreaty[] = [
  // --- Canadian Numbered Treaties ---
  {
    slug: "treaty-1-1871",
    name: "Treaty No. 1 (Stone Fort Treaty)",
    shortName: "Treaty 1",
    openedAt: "1871-08-03",
    summary: "The first of the post-Confederation Numbered Treaties between the Crown and Anishinaabe and Swampy Cree peoples in present-day Manitoba.",
    fullText: "Treaty 1 was concluded at Lower Fort Garry on 3 August 1871 between Her Majesty the Queen and the Chippewa and Swampy Cree Tribes of Indians. Under Crown interpretation, the Indians ceded title to the lands described, in exchange for reserve allotments, annuities, schools, and other promises. Oral histories of the signatories describe a relationship of sharing and ongoing partnership, materially different from the cession framing in the written text.",
    sourceUrl: "https://www.rcaanc-cirnac.gc.ca/eng/1100100028664/1581293791063",
    topicSlugs: ["indigenous-rights", "numbered-treaty", "land-and-resources"],
    signatories: [
      { partyCode: "CA-CROWN", signedAt: "1871-08-03" },
      { partyCode: "ANISHINAABE-T1", signedAt: "1871-08-03" },
    ],
  },
  {
    slug: "treaty-4-1874",
    name: "Treaty No. 4 (Qu'Appelle Treaty)",
    shortName: "Treaty 4",
    openedAt: "1874-09-15",
    summary: "Treaty between the Crown and Cree, Saulteaux, and other peoples in southern present-day Saskatchewan.",
    fullText: "Treaty 4 was concluded at Qu'Appelle Lakes on 15 September 1874. Under Crown interpretation, the signatory Nations ceded title to the lands described in exchange for reserve allotments, annuities, schools, ammunition and twine, and certain agricultural assistance. Several First Nations and scholars contest the cession framing and emphasize the treaty as a nation-to-nation sharing agreement.",
    sourceUrl: "https://www.rcaanc-cirnac.gc.ca/eng/1100100028689/1581293682801",
    topicSlugs: ["indigenous-rights", "numbered-treaty", "land-and-resources"],
    signatories: [
      { partyCode: "CA-CROWN", signedAt: "1874-09-15" },
      { partyCode: "CREE-SAULTEAUX-T4", signedAt: "1874-09-15" },
    ],
  },
  {
    slug: "treaty-6-1876",
    name: "Treaty No. 6",
    shortName: "Treaty 6",
    openedAt: "1876-08-23",
    summary: "Numbered Treaty covering large portions of present-day Saskatchewan and Alberta; unique among the Numbered Treaties in including the medicine-chest clause and a famine-relief commitment.",
    fullText: "Treaty 6 was concluded at Fort Carlton and Fort Pitt in August and September 1876 between Her Majesty the Queen and the Plain and Wood Cree Tribes of Indians and other Tribes of Indians inhabiting the country described. The treaty included promises of reserves, annuities, agricultural assistance, schools 'on reserves whenever the Indians of the reserve shall desire it', a medicine chest to be kept at the agent's house for use by the Indians, and assistance in the event of pestilence or general famine. Cree understanding of the treaty, as recorded in oral histories and revisited in modern legal scholarship, frames the agreement as one of sharing the land and establishing ongoing nation-to-nation relations.",
    sourceUrl: "https://www.rcaanc-cirnac.gc.ca/eng/1100100028710/1581292569426",
    topicSlugs: ["indigenous-rights", "numbered-treaty", "land-and-resources"],
    signatories: [
      { partyCode: "CA-CROWN", signedAt: "1876-08-23" },
      { partyCode: "PLAINS-CREE", signedAt: "1876-08-23" },
      { partyCode: "WOODS-CREE", signedAt: "1876-09-09" },
    ],
  },
  {
    slug: "treaty-7-1877",
    name: "Treaty No. 7",
    shortName: "Treaty 7",
    openedAt: "1877-09-22",
    summary: "Numbered Treaty covering southern Alberta, signed at Blackfoot Crossing between the Crown and the Blackfoot Confederacy, Stoney, and Tsuut'ina.",
    fullText: "Treaty 7 was concluded at Blackfoot Crossing on 22 September 1877 between Her Majesty the Queen and the Blackfoot, Blood, Piegan, Sarcee, Stoney and other Indian inhabitants of the territory described. Under Crown interpretation, the Nations ceded title to the lands in exchange for reserves, annuities, schools, ammunition, and cattle. Oral histories — notably the work compiled in 'The True Spirit and Original Intent of Treaty 7' — record a substantially different understanding of what was agreed, emphasizing peace and sharing rather than land surrender.",
    sourceUrl: "https://www.rcaanc-cirnac.gc.ca/eng/1100100028793/1581294028469",
    topicSlugs: ["indigenous-rights", "numbered-treaty", "land-and-resources"],
    signatories: [
      { partyCode: "CA-CROWN", signedAt: "1877-09-22" },
      { partyCode: "BLACKFOOT-CONFEDERACY", signedAt: "1877-09-22" },
      { partyCode: "STONEY-NAKODA", signedAt: "1877-09-22" },
      { partyCode: "TSUUT-INA", signedAt: "1877-09-22" },
    ],
  },
  {
    slug: "treaty-8-1899",
    name: "Treaty No. 8",
    shortName: "Treaty 8",
    openedAt: "1899-06-21",
    summary: "Numbered Treaty covering northern Alberta, northeastern British Columbia, northwestern Saskatchewan, and southern Northwest Territories. Directly relevant to modern oil & gas and hydroelectric projects in NE BC.",
    fullText: "Treaty 8 was concluded at Lesser Slave Lake on 21 June 1899 and at various adhesions in subsequent years between Her Majesty the Queen and the Cree, Beaver, Chipewyan and other Indians inhabiting the territory described. The treaty includes the commitment that the signatories 'shall have the right to pursue their usual vocations of hunting, trapping and fishing throughout the tract surrendered ... subject to such regulations as may from time to time be made by the Government of the country, acting under the authority of Her Majesty, and saving and excepting such tracts as may be required or taken up from time to time for settlement, mining, lumbering, trading or other purposes'. The interpretation of the 'taking up' clause and its limits has been central to modern litigation, most notably Yahey v. British Columbia (2021 BCSC 1287), which found that cumulative industrial development had infringed the Treaty 8 rights of Blueberry River First Nations.",
    sourceUrl: "https://www.rcaanc-cirnac.gc.ca/eng/1100100028813/1581293624572",
    topicSlugs: ["indigenous-rights", "numbered-treaty", "land-and-resources"],
    signatories: [
      { partyCode: "CA-CROWN", signedAt: "1899-06-21" },
      { partyCode: "BEAVER", signedAt: "1899-06-21" },
      { partyCode: "CHIPEWYAN", signedAt: "1899-06-21" },
    ],
  },
  {
    slug: "treaty-11-1921",
    name: "Treaty No. 11",
    shortName: "Treaty 11",
    openedAt: "1921-06-27",
    summary: "The last of the Numbered Treaties, covering the Mackenzie River valley in present-day Northwest Territories. Its interpretation has been the subject of long-running negotiation and litigation.",
    fullText: "Treaty 11 was concluded at Fort Providence on 27 June 1921 and at adhesions throughout the summer of 1921. The Crown's written text described surrender of title in exchange for reserves, annuities, and certain undertakings. Dene Nations and many legal scholars have contested that interpretation; the Paulette case (1973) found that the Crown's treaty commissioners had not in fact extinguished Indigenous title. Subsequent comprehensive land claims and self-government agreements in the region (Sahtu, Gwich'in, Tlicho) operate alongside and partly in light of Treaty 11.",
    sourceUrl: "https://www.rcaanc-cirnac.gc.ca/eng/1100100028916/1581293724908",
    topicSlugs: ["indigenous-rights", "numbered-treaty", "land-and-resources", "self-determination"],
    signatories: [
      { partyCode: "CA-CROWN", signedAt: "1921-06-27" },
      { partyCode: "DENE-TREATY11", signedAt: "1921-06-27" },
    ],
  },
  // --- International instruments ---
  {
    slug: "un-charter-1945",
    name: "Charter of the United Nations",
    shortName: "UN Charter",
    openedAt: "1945-06-26",
    enteredIntoForceAt: "1945-10-24",
    depository: "Government of the United States of America",
    summary: "Founding instrument of the United Nations. Affirms the principle of self-determination of peoples (Article 1(2)) — the legal anchor for later Indigenous self-determination instruments.",
    fullText: "The Charter of the United Nations was signed in San Francisco on 26 June 1945 and entered into force on 24 October 1945. Article 1, paragraph 2 lists 'to develop friendly relations among nations based on respect for the principle of equal rights and self-determination of peoples' among the purposes of the Organization. Articles 55 and 56 commit Members to promote, inter alia, higher standards of living, conditions of economic and social progress and development, and universal respect for human rights and fundamental freedoms.",
    sourceUrl: "https://www.un.org/en/about-us/un-charter",
    topicSlugs: ["international-organisations", "self-determination"],
    signatories: [
      { partyCode: "UN-MEMBER-STATES", signedAt: "1945-06-26", ratifiedAt: "1945-10-24" },
    ],
  },
  {
    slug: "vclt-1969",
    name: "Vienna Convention on the Law of Treaties",
    shortName: "VCLT",
    openedAt: "1969-05-23",
    enteredIntoForceAt: "1980-01-27",
    depository: "Secretary-General of the United Nations",
    summary: "Codifies the rules of international law applicable to treaties between states. Reference framework for interpretation of every international treaty, including those affecting Indigenous peoples.",
    fullText: "The Vienna Convention on the Law of Treaties was concluded at Vienna on 23 May 1969 and entered into force on 27 January 1980. It codifies the general law of treaties: how they are concluded, what constitutes consent to be bound, how reservations operate, how treaties are interpreted (notably Articles 31 and 32 on interpretation in good faith in accordance with ordinary meaning, context, and purpose, with supplementary recourse to preparatory work), and how termination and suspension operate.",
    sourceUrl: "https://legal.un.org/ilc/texts/instruments/english/conventions/1_1_1969.pdf",
    topicSlugs: ["law-of-treaties", "international-organisations"],
    signatories: [
      { partyCode: "UN-MEMBER-STATES", signedAt: "1969-05-23" },
    ],
  },
  {
    slug: "ilo-c169-1989",
    name: "ILO Convention No. 169 — Indigenous and Tribal Peoples Convention",
    shortName: "ILO 169",
    openedAt: "1989-06-27",
    enteredIntoForceAt: "1991-09-05",
    depository: "Director-General of the International Labour Office",
    summary: "International labour convention setting standards for the rights of Indigenous and tribal peoples. Includes consultation and participation requirements stronger than UNDRIP for ratifying states. Canada has not ratified.",
    fullText: "ILO Convention 169 was adopted by the International Labour Conference at its 76th session, Geneva, 27 June 1989 and entered into force on 5 September 1991. Article 6 requires governments to consult Indigenous and tribal peoples through appropriate procedures and through their representative institutions whenever consideration is being given to legislative or administrative measures which may affect them directly. Article 7 affirms the right to decide their own priorities for the process of development. Articles 13–19 address land and resource rights, including the right to participate in the use, management and conservation of natural resources pertaining to their lands.",
    sourceUrl: "https://www.ilo.org/dyn/normlex/en/f?p=NORMLEXPUB:12100:0::NO::P12100_ILO_CODE:C169",
    topicSlugs: ["indigenous-rights", "labour-rights", "self-determination"],
    signatories: [
      { partyCode: "ILO", signedAt: "1989-06-27", ratifiedAt: "1991-09-05" },
    ],
  },
  {
    slug: "undrip-2007",
    name: "United Nations Declaration on the Rights of Indigenous Peoples",
    shortName: "UNDRIP",
    openedAt: "2007-09-13",
    depository: "Secretary-General of the United Nations",
    summary: "UN General Assembly declaration affirming the rights of Indigenous peoples, including self-determination, lands, territories, resources, and the principle of free, prior and informed consent (FPIC).",
    fullText: "The United Nations Declaration on the Rights of Indigenous Peoples was adopted by the General Assembly on 13 September 2007 (resolution 61/295). Article 3 affirms the right of self-determination. Article 19 requires States to consult and cooperate in good faith with Indigenous peoples concerned through their own representative institutions in order to obtain their free, prior and informed consent before adopting and implementing legislative or administrative measures that may affect them. Article 32 requires the same standard before the approval of any project affecting their lands or territories and other resources, particularly in connection with the development, utilization or exploitation of mineral, water or other resources. Article 28 addresses redress, including restitution, for lands taken without free, prior and informed consent.",
    sourceUrl: "https://www.un.org/development/desa/indigenouspeoples/declaration-on-the-rights-of-indigenous-peoples.html",
    topicSlugs: ["indigenous-rights", "self-determination", "land-and-resources"],
    signatories: [
      { partyCode: "UN-GA", signedAt: "2007-09-13" },
    ],
  },
  {
    slug: "geneva-iv-1949",
    name: "Geneva Convention IV: Protection of Civilian Persons in Time of War",
    shortName: "Geneva IV",
    openedAt: "1949-08-12",
    enteredIntoForceAt: "1950-10-21",
    depository: "Swiss Federal Council",
    summary: "The fourth Geneva Convention, governing the protection of civilians during armed conflict. Included for completeness as a cornerstone of modern international humanitarian law.",
    fullText: "The Fourth Geneva Convention was adopted on 12 August 1949 and entered into force on 21 October 1950. It is the principal instrument of international humanitarian law governing the protection of civilians in time of war and occupation. The Convention addresses the treatment of protected persons, the conduct of occupying powers, internment, and a wide range of obligations on belligerents and occupying authorities.",
    sourceUrl: "https://www.icrc.org/en/doc/assets/files/publications/icrc-002-0173.pdf",
    topicSlugs: ["humanitarian-law", "international-organisations"],
    signatories: [
      { partyCode: "UN-MEMBER-STATES", signedAt: "1949-08-12" },
    ],
  },
  {
    slug: "paris-agreement-2015",
    name: "Paris Agreement (UNFCCC)",
    shortName: "Paris Agreement",
    openedAt: "2015-12-12",
    enteredIntoForceAt: "2016-11-04",
    depository: "Secretary-General of the United Nations",
    summary: "International climate treaty under the UN Framework Convention on Climate Change. Frames the policy environment within which energy infrastructure investment and Indigenous-led energy transition operate.",
    fullText: "The Paris Agreement was adopted at COP 21 on 12 December 2015 and entered into force on 4 November 2016. It establishes a long-term temperature goal of holding the increase in global average temperature to well below 2°C above pre-industrial levels and pursuing efforts to limit the increase to 1.5°C. Parties communicate Nationally Determined Contributions (NDCs) every five years, with each successive NDC representing a progression beyond the previous one. The preamble acknowledges that Parties should, when taking action to address climate change, respect, promote and consider their respective obligations on the rights of Indigenous peoples.",
    sourceUrl: "https://unfccc.int/process-and-meetings/the-paris-agreement",
    topicSlugs: ["environment-climate", "international-organisations"],
    signatories: [
      { partyCode: "UN-MEMBER-STATES", signedAt: "2016-04-22", ratifiedAt: "2016-11-04" },
    ],
  },
];

async function main() {
  // Reset (clean re-seed)
  await prisma.signature.deleteMany();
  await prisma.treaty.deleteMany();
  await prisma.party.deleteMany();
  await prisma.topic.deleteMany();

  // Topics
  await prisma.topic.createMany({
    data: TOPICS.map((t) => ({ slug: t.slug, name: t.name })),
  });

  // Parties
  await prisma.party.createMany({
    data: PARTIES.map((p) => ({ code: p.code, name: p.name, type: p.type })),
  });

  // Resolve party id-by-code map
  const allParties = await prisma.party.findMany();
  const partyByCode = new Map(allParties.map((p) => [p.code, p.id]));

  // Resolve topic id-by-slug map
  const allTopics = await prisma.topic.findMany();
  const topicBySlug = new Map(allTopics.map((t) => [t.slug, t.id]));

  for (const t of TREATIES) {
    await prisma.treaty.create({
      data: {
        slug: t.slug,
        name: t.name,
        shortName: t.shortName,
        openedAt: new Date(t.openedAt),
        enteredIntoForceAt: t.enteredIntoForceAt ? new Date(t.enteredIntoForceAt) : undefined,
        depository: t.depository,
        summary: t.summary,
        fullText: t.fullText,
        sourceUrl: t.sourceUrl,
        topics: {
          connect: t.topicSlugs
            .map((slug) => topicBySlug.get(slug))
            .filter((id): id is string => Boolean(id))
            .map((id) => ({ id })),
        },
        signatures: {
          create: t.signatories
            .map((s) => {
              const partyId = partyByCode.get(s.partyCode);
              if (!partyId) {
                console.warn(`Unknown party code: ${s.partyCode} for ${t.slug}`);
                return null;
              }
              return {
                partyId,
                signedAt: s.signedAt ? new Date(s.signedAt) : undefined,
                ratifiedAt: s.ratifiedAt ? new Date(s.ratifiedAt) : undefined,
                reservation: s.reservation,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null),
        },
      },
    });
  }

  const treatyCount = await prisma.treaty.count();
  const partyCount = await prisma.party.count();
  const signatureCount = await prisma.signature.count();
  const topicCount = await prisma.topic.count();

  console.log(
    `Seeded: ${treatyCount} treaties, ${partyCount} parties, ${signatureCount} signatures, ${topicCount} topics`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
