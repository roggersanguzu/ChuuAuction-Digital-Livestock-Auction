const fs = require("fs");
const path = require("path");

const outputPath = path.join(process.cwd(), "Proposal.pdf");

const pages = [
  {
    title: "ChuuAuction Project Paper",
    lines: [
      "Introduction",
      "",
      "ChuuAuction is a digital livestock auction platform created to improve how livestock is bought and sold.",
      "The project focuses on a real problem where farmers and buyers often depend on informal market systems",
      "that are difficult to trust, difficult to track, and difficult to manage once money is involved.",
      "In many livestock markets, prices are negotiated with limited transparency, records are weak, and there",
      "is often no structured way to prove who won a sale or whether payment was completed. ChuuAuction was",
      "designed to reduce those gaps by turning livestock trade into a more organized digital process.",
      "",
      "The platform allows sellers to list animals, buyers to place bids, and administrators to oversee the",
      "activity happening across the system. Once a winning bid is declared, the winning buyer is directed to",
      "a dedicated payment flow. This creates a clear separation between bidding and payment, which helps the",
      "whole process remain easier to follow. Instead of mixing every action on one page, the platform guides",
      "users from one step to the next in a way that feels more controlled and less confusing.",
      "",
      "This project is important because livestock trade is not only a business process, it is also connected",
      "to livelihoods, trust, and local economic activity. A digital platform in this area must do more than",
      "look modern. It must support real users who need clear records, predictable steps, and better follow up.",
      "That is the reason ChuuAuction includes role based dashboards, transaction visibility, and payment",
      "tracking instead of stopping at simple listings and bids.",
      "",
      "The project was also built with the understanding that not every user needs the same interface. Buyers,",
      "sellers, and administrators all interact with the system differently. Buyers care about bids, winning",
      "status, and payment. Sellers care about listings, current bids, and whether the winner has paid.",
      "Administrators care about platform control, user activity, and full transaction visibility. The design",
      "of ChuuAuction reflects those differences rather than treating every user as if they have the same goals.",
      "",
      "From a wider point of view, the project shows how digital systems can be applied to local market problems",
      "in a practical way. It is not only a technical exercise. It is a system built around a real trading",
      "process, where each feature is connected to a recognizable need in livestock commerce."
    ]
  },
  {
    title: "Problem Statement And Objectives",
    lines: [
      "Traditional livestock trading often depends on face to face negotiation, physical presence, fragmented",
      "records, and verbal agreements. These practices can work in small trusted circles, but they become weak",
      "when the market grows wider or when buyers and sellers do not know each other well. A seller may not be",
      "sure whether an interested buyer is serious. A buyer may not trust the description or ownership details.",
      "Even after bidding, there may still be uncertainty about whether payment will happen.",
      "",
      "The main problem addressed by ChuuAuction is the lack of a structured and trackable digital auction flow",
      "for livestock sales. Existing methods often fail to provide transparent bidding, reliable transaction",
      "history, and role based access to information. This makes the process harder to trust and harder to",
      "manage over time.",
      "",
      "The project was guided by several objectives.",
      "",
      "The first objective was to create a platform where livestock can be listed and auctioned in a way that is",
      "clear to both sellers and buyers. This means each listing should be visible, each bid should be traceable,",
      "and the winner should be identifiable once the auction process is complete.",
      "",
      "The second objective was to introduce a dedicated winner payment process. Instead of assuming that a winning",
      "bid automatically means a successful transaction, the project separates payment into its own step. This",
      "helps the system reflect real trade more honestly, since many disputes happen after the winner is known.",
      "",
      "The third objective was to create transaction tracking for all relevant users. Buyers need to see payments",
      "connected to their purchases. Sellers need to track transactions linked to their own sales. Administrators",
      "need a wider view of all transactions across the platform in order to support monitoring and accountability.",
      "",
      "The fourth objective was to make the system role aware. A marketplace becomes confusing when every user sees",
      "everything. ChuuAuction was built so that each user sees what is useful for their role while still keeping",
      "important actions accessible and understandable.",
      "",
      "The fifth objective was to improve trust in the auction process through verification support, payment",
      "references, and status based transaction tracking. Together, these features help turn livestock trade from",
      "a loosely managed activity into a more visible and manageable digital process."
    ]
  },
  {
    title: "System Design And Major Features",
    lines: [
      "ChuuAuction is structured as a full stack web application with clear separation between models, routes,",
      "controllers, views, and service integrations. This design helps the project remain organized while allowing",
      "new features to be added without breaking already working parts of the system.",
      "",
      "The platform includes separate dashboards for buyers, farmers or sellers, and administrators. This role",
      "based structure is one of the system's strongest design choices because it reduces clutter and allows each",
      "user type to focus on the tasks that matter to them. Buyers can review bids and payments. Sellers can follow",
      "their auction activity and sales related transactions. Administrators can review wider platform activity and",
      "see all recorded payment transactions.",
      "",
      "The livestock listing and bidding flow forms the foundation of the project. Sellers add animals to the",
      "platform, and buyers compete through bids. Once bidding ends, the winning buyer can be declared. At that",
      "point, the system creates a dedicated payment path rather than leaving payment to happen informally.",
      "",
      "The winner checkout page is one of the most important parts of the platform. It displays the winning amount,",
      "the selected livestock details, the seller, the buyer, and the current payment state. It also prepares the",
      "payment request through IntaSend. This page was designed to feel focused, clear, and separate from the main",
      "bidding interface so that users do not confuse bidding actions with financial actions.",
      "",
      "Payment integration is handled through IntaSend, beginning with sandbox testing. The system supports payment",
      "session creation, provider references, invoice tracking, and webhook based updates. Even though an external",
      "provider is involved, ChuuAuction stores transaction data locally so that the app itself maintains a usable",
      "history of what happened. This is important for follow up, support, and future growth.",
      "",
      "Transaction dashboards are another major feature. Buyers and sellers can each see transactions directly tied",
      "to their account, while admins can see all transactions in the system. The transaction page includes summary",
      "cards, filtering, search, status visibility, and responsive behavior for smaller screens. This gives the",
      "platform a stronger operational side instead of leaving payment data hidden behind external provider pages.",
      "",
      "The project also includes verification related features and admin controls, both of which contribute to trust",
      "and oversight. These parts support the idea that a serious marketplace needs more than just attractive pages,",
      "it also needs control, accountability, and useful structure behind the scenes."
    ]
  },
  {
    title: "Benefits, Impact, And Current Strengths",
    lines: [
      "One of the clearest benefits of ChuuAuction is that it makes the livestock sale process easier to follow.",
      "Instead of relying on scattered conversations and memory, users can move through a visible sequence that",
      "includes listing, bidding, winner declaration, payment, and transaction tracking. That structure alone gives",
      "the platform practical value.",
      "",
      "For sellers, the project creates a better path to market. A seller can present livestock to a broader set of",
      "buyers and observe bidding activity in a structured environment. More importantly, the seller can later track",
      "whether the winning bidder actually completed payment. This reduces one of the biggest frustrations in many",
      "auction processes, where the outcome looks good on paper but does not lead to a real completed sale.",
      "",
      "For buyers, the system creates more confidence. Buyers can see available livestock, place bids, know whether",
      "they have won, and move into a payment flow that is separate and easier to understand. The dedicated payment",
      "page and transaction history reduce uncertainty because the user is not left guessing about status.",
      "",
      "For administrators, the project offers control and visibility. Admins can inspect platform wide payment",
      "records and use that information to support issue resolution, monitoring, and general platform oversight.",
      "This is valuable because any serious marketplace needs at least one role with wider operational awareness.",
      "",
      "The project also stands out because it is built around a meaningful domain. Many software projects are based",
      "on generic online store ideas. ChuuAuction is more distinctive because it focuses on livestock trade, which",
      "comes with its own trust challenges, market behaviors, and record keeping needs. That gives the project",
      "stronger local relevance and a clearer identity.",
      "",
      "Another strength of the system is that it is already structured in a way that supports further growth. The",
      "codebase separates concerns cleanly, the payment flow is isolated from bidding logic, and transaction records",
      "are stored in a useful way. These choices make it easier to improve the project over time without having to",
      "rebuild everything from the beginning.",
      "",
      "Overall, the project is already useful as a learning system, a demonstration platform, and a practical",
      "prototype for a real digital livestock marketplace."
    ]
  },
  {
    title: "Conclusion And Future Work",
    lines: [
      "ChuuAuction demonstrates how a digital platform can be used to improve livestock trade by making key steps",
      "more visible, more trackable, and more trustworthy. It does this by bringing together listing, bidding,",
      "winner declaration, payment handling, and transaction tracking in one connected system.",
      "",
      "The project is especially valuable because it does not stop at surface level features. It recognizes that a",
      "marketplace only becomes truly useful when people can follow what happens after a bid is won. By adding a",
      "dedicated payment flow and transaction dashboards, the system responds to one of the most practical needs in",
      "real trade, proof that a transaction moved forward properly.",
      "",
      "The role based structure of the platform also contributes to its strength. Buyers, sellers, and administrators",
      "do not see the same information because they do not need the same information. This makes the experience more",
      "focused and more realistic. It also protects privacy while still giving admins the broader access required for",
      "oversight.",
      "",
      "Even with its current strengths, the project still has room to grow. Future improvements could include richer",
      "verification workflows, delivery and logistics tracking, alerts for payment events, exportable reports, trust",
      "ratings, and deeper mobile first refinement across all pages. These additions would not replace the current",
      "system, they would build on a foundation that is already meaningful and well directed.",
      "",
      "In conclusion, ChuuAuction is a strong example of a practical digital solution built around a real local",
      "problem. It is technically solid, socially relevant, and clearly positioned around the needs of livestock",
      "buyers, livestock sellers, and platform administrators. Its value comes not only from the code itself, but",
      "from the fact that it turns an informal trade process into a more organized, transparent, and manageable",
      "digital experience.",
      "",
      "That is what makes this project worth studying, presenting, and continuing to improve."
    ]
  }
];

function escapePdfText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildContentStream(page) {
  const left = 56;
  const top = 760;
  const lineHeight = 18;
  const lines = [];

  lines.push("BT");
  lines.push("/F1 18 Tf");
  lines.push(`${left} ${top} Td`);
  lines.push(`(${escapePdfText(page.title)}) Tj`);
  lines.push("0 -28 Td");
  lines.push("/F1 11 Tf");

  let firstBodyLine = true;
  for (const line of page.lines) {
    if (!firstBodyLine) {
      lines.push(`0 -${lineHeight} Td`);
    }
    lines.push(`(${escapePdfText(line)}) Tj`);
    firstBodyLine = false;
  }

  lines.push("ET");
  return lines.join("\n");
}

const objects = [];

function addObject(body) {
  objects.push(body);
  return objects.length;
}

const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const pageRefs = [];

for (const page of pages) {
  const content = buildContentStream(page);
  const contentId = addObject(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
  pageRefs.push({ contentId });
}

const pagesId = addObject("");

for (const ref of pageRefs) {
  const pageId = addObject(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${ref.contentId} 0 R >>`
  );
  ref.pageId = pageId;
}

objects[pagesId - 1] = `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((ref) => `${ref.pageId} 0 R`).join(" ")}] >>`;

const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

let pdf = "%PDF-1.4\n";
const offsets = [0];

for (let i = 0; i < objects.length; i += 1) {
  offsets.push(Buffer.byteLength(pdf, "utf8"));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";

for (let i = 1; i < offsets.length; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}

pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

fs.writeFileSync(outputPath, pdf, "binary");
console.log(`Wrote ${pages.length} page PDF to ${outputPath}`);
