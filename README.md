
# ChuuAuction

ChuuAuction is a digital livestock auction platform built for real trade, real farmers, real buyers, and real transactions.

This project was created to make livestock selling more open, more trusted, and easier to manage. Instead of depending on middlemen, guesswork, rushed negotiations, or unclear follow up after bidding, the platform gives users one connected system where livestock can be listed, bids can be placed, winners can be declared, and payments can be tracked properly.

This is not just a website for posting animals.

It is a platform built around how livestock trade actually works. In this space, trust matters, payment follow through matters, and clear records matter. That is why the system was designed to do more than just display listings. It supports the full path from listing to bidding to winner payment to transaction tracking.

## What The Project Is About

ChuuAuction helps move livestock trade from a scattered manual process into a more organized digital flow.

A seller lists an animal.

Buyers place bids on that listing.

When the auction closes, a winner can be declared.

That winner then moves into a dedicated payment flow instead of mixing payment with the normal bidding page.

This matters because winning a bid is not the same as completing a payment. The platform separates those steps so that both sides can clearly see what has happened and what is still pending.

The project was built around practical needs that are easy to understand

- helping sellers reach buyers more fairly
- helping buyers bid with more confidence
- helping both sides keep records
- helping admins monitor what is happening on the platform
- reducing confusion after a winner has been declared
- creating a clearer way to follow transactions

## Why This Project Matters

Livestock trade is important, but in many cases the process is still difficult.

People often face problems like these

- unclear prices
- poor record keeping
- fake promises after bidding
- delayed or disputed payments
- limited visibility across distance
- too much dependence on brokers or middlemen
- weak trust between buyer and seller

This project responds to those issues in a practical way.

It does not try to solve every market problem at once. Instead, it improves the parts that software can improve in a meaningful way.

- auctions help buyers compete openly
- seller listings make the market more visible
- winner payment flow improves follow through
- transaction history helps users keep track
- admin visibility supports platform control
- verification related features strengthen trust

That makes ChuuAuction more than a classroom system. It is shaped around a real local problem and tries to solve it in a usable way.

## Main Users

### Farmers And Sellers

Sellers use the platform to bring livestock to market in a more organized way.

They can

- create livestock listings
- manage auction activity
- watch bids come in
- see when a winner has been declared
- track transactions connected to their sales

This is important because a seller does not only care about interest during bidding. A seller also needs to know whether the winner actually completed payment.

### Buyers

Buyers use the platform to discover animals, place bids, monitor their bid activity, and pay after winning.

They can

- browse livestock
- join auctions
- see their bids
- know when they have won
- go to a separate payment page
- view their own transaction history

This helps the buyer move through the process with less confusion.

### Administrators

Admins oversee the whole platform.

They can

- monitor users
- oversee auctions
- inspect transaction activity
- view all recorded payment transactions
- help maintain platform order and trust

Admins are the only users who can see every transaction in the system.

That rule is intentional.

Normal users only see transactions where their account was directly involved, while admins get system wide visibility.

## Core Features

### Role Based Dashboards

Different users need different tools.

That is why the project has separate dashboard experiences for major roles.

- buyer dashboard
- farmer dashboard
- admin dashboard

This keeps the experience more focused and less cluttered.

### Livestock Listing

Sellers can create listings for animals so buyers can browse what is available.

The platform gives structure to the selling process instead of leaving everything to informal conversations.

### Bidding System

Buyers can place bids on available livestock listings.

This gives the platform a competitive auction flow instead of a fixed one price marketplace.

That makes price discovery more open and more dynamic.

### Winner Declaration

When bidding ends, the winning bid can be declared.

This makes the auction outcome clear and creates a transition into the next stage, payment.

### Winner Payment Flow

One of the strongest parts of the project is the dedicated payment flow for winning buyers.

Instead of keeping payment mixed into the normal bid screen, the winner is taken to a separate payment page that shows

- winning amount
- animal details
- seller details
- buyer details
- current payment status
- payment reference information

This separation keeps the bidding flow intact while giving payment the attention it needs.

### Payment Integration

The platform uses IntaSend for payment processing.

The payment work was first set up in sandbox mode so the system could be tested safely before moving to a live environment.

The current payment design supports

- hosted checkout creation
- stored local transaction records
- payment status updates
- webhook support
- role based transaction visibility

### Transaction Tracking

Transactions are stored in the system and shown based on user role.

- admins can see all transactions
- buyers can see their own transactions
- sellers can see transactions linked to their sales

This is important because it creates a clear record of what happened on the platform.

### Verification Related Support

The project also includes verification related work that supports trust and platform control.

This matters in a system where people need confidence about the users and activity involved.

## Payment And Transaction Flow

The payment side of the project is one of the most practical parts of the system.

After a winning bid is declared, the winner goes to a dedicated checkout page.

That page shows the amount, the auction details, the people involved, and the current payment status.

The system creates a payment reference and tracks the state of the transaction as it moves through stages like

- pending
- processing
- complete
- failed
- cancelled

This matters because payment should never feel vague.

Users need to know whether it started, whether it completed, and whether it failed.

The platform keeps transaction records locally so there is still a clear history inside the app even while working with an external payment provider.

That gives the project more accountability and makes future follow up easier.

## What Makes ChuuAuction Different

Many projects are technically fine but still feel generic because they solve made up problems or copy common online store ideas.

ChuuAuction stands out because it focuses on a real use case that is often overlooked.

Its strongest difference points include

- livestock specific focus
- auction based selling
- winner only payment flow
- role based transaction visibility
- admin wide transaction access
- local market relevance
- trust oriented design

The project does not try to act like a normal shopping cart website.

It is built around the reality of livestock trade, which gives it more identity and stronger practical value.

## Technical Shape Of The Project

This is a full stack web application with clear separation between data, logic, routes, views, and services.

The project uses

- models for data structure
- controllers for feature logic
- routes for request handling
- Handlebars views for rendered pages
- frontend scripts for dynamic dashboard behavior
- service code for external integrations like IntaSend

This structure helps the project stay organized as features grow.

Important files in the project include

- `models/User.js`
- `models/PaymentTransaction.js`
- `controllers/paymentController.js`
- `services/intasendService.js`
- `routes/paymentRoutes.js`
- `views/dashboard/payment.hbs`
- `views/dashboard/transactions.hbs`

## Dashboard And UI Direction

The user interface of ChuuAuction is not only there to look good.

It is meant to help users feel clear about what they should do next.

Some important UI areas include

- separate dashboards for each role
- a dedicated payment page for winners
- transaction dashboards for buyers, sellers, and admins
- responsive layouts for desktop and smaller screens
- clickable dashboard cards and filters for transaction views

The payment page was designed to feel focused and premium, while the transaction dashboard was made to support tracking, filtering, and quick review of payment history.

## Transaction Visibility Rules

The project follows a simple access model for transaction data.

- admin users can see all transactions in the platform
- buyers can only see transactions where they are the buyer
- sellers can only see transactions where they are the seller

This rule helps protect user privacy while still giving admins the oversight they need.

## Running The Project

Install dependencies and start the app locally

```bash
npm install
npm run dev
```

If your setup uses a normal start script, use

```bash
npm start
```

The app usually runs on

```text
http://localhost:3000
```

## Environment Setup

The project uses environment variables for payment and deployment configuration.

A sandbox payment setup looks like this

```env
INTASEND_PUBLISHABLE_KEY=your_test_publishable_key
INTASEND_SECRET_KEY=your_test_secret_key
INTASEND_TEST_MODE=true
INTASEND_CURRENCY=KES
INTASEND_WEBHOOK_CHALLENGE=your_random_secret_value
APP_BASE_URL=https://your-hosted-url
```

For hosted use, the same values should also be placed in your hosting environment settings.

## Sandbox To Live

The project was set up so payment can move from sandbox testing to live use without rewriting the whole payment system.

The main changes are

- replace sandbox publishable key with live publishable key
- replace sandbox secret key with live secret key
- set test mode to false
- confirm the live webhook settings
- restart the hosted application

That means the payment structure is already prepared for real deployment when the platform is ready.

## What Has Already Been Implemented

The project already includes a strong set of working features.

- role based login and dashboards
- livestock listing flow
- bidding and winner declaration flow
- dedicated winner payment page
- IntaSend payment integration
- stored transaction records
- buyer transaction visibility
- seller transaction visibility
- admin full transaction visibility
- responsive payment and transaction pages
- clickable transaction summary cards

This is no longer just an idea on paper. It is a working system with connected features.

## Honest Limits And Future Growth

Like any serious project, ChuuAuction still has room to grow.

Possible next improvements include

- stronger notifications for payment updates
- richer reporting and exports
- dispute handling
- delivery and transport follow up
- deeper verification workflows
- ratings and trust scoring
- more mobile first refinements across every page
- analytics for users and admins

These do not mean the project is weak.

They simply show that it has a real future path beyond the current development phase.

## Why This Project Is Worth Showing

ChuuAuction is worth showing because it is practical, grounded, and built around a problem that matters.

It combines

- livestock marketplace design
- auction logic
- payment handling
- transaction accountability
- role based visibility
- admin oversight

That gives it more value than a generic sample app.

It shows that the system was built with real users and real process in mind.

## Final Words

ChuuAuction is a project about making livestock trade more visible, more organized, and more trustworthy.

It helps sellers bring animals to market more clearly.

It helps buyers compete and pay with more confidence.

It helps admins keep the platform under control.

Most importantly, it turns separate manual steps into one connected digital flow.

That is what gives the project its strength.
