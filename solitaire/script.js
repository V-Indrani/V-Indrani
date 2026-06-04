const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const state = {
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  selected: null,
  message: "",
};

const stockEl = document.getElementById("stock");
const wasteEl = document.getElementById("waste");
const foundationsEl = document.getElementById("foundations");
const tableauEl = document.getElementById("tableau");
const statusEl = document.getElementById("status");
const newGameEl = document.getElementById("new-game");

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function cardColor(card) {
  return card.suit === "♥" || card.suit === "♦" ? "red" : "black";
}

function canMoveToFoundation(card, foundationPile) {
  if (foundationPile.length === 0) {
    return card.rank === 1;
  }
  const top = foundationPile[foundationPile.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

function canMoveToTableau(card, tableauPile) {
  if (tableauPile.length === 0) {
    return card.rank === 13;
  }
  const top = tableauPile[tableauPile.length - 1];
  if (!top.faceUp) {
    return false;
  }
  return card.rank === top.rank - 1 && cardColor(card) !== cardColor(top);
}

function createDeck() {
  const cards = [];
  let id = 0;
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      cards.push({ id: `${suit}-${rank}-${id++}`, suit, rank, faceUp: false });
    }
  }
  return shuffle(cards);
}

function startGame() {
  state.stock = [];
  state.waste = [];
  state.foundations = [[], [], [], []];
  state.tableau = [[], [], [], [], [], [], []];
  state.selected = null;
  state.message = "";

  const deck = createDeck();
  for (let pileIndex = 0; pileIndex < 7; pileIndex += 1) {
    for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex += 1) {
      const card = deck.pop();
      card.faceUp = cardIndex === pileIndex;
      state.tableau[pileIndex].push(card);
    }
  }

  state.stock = deck;
  render();
}

function drawFromStock() {
  if (state.stock.length > 0) {
    const card = state.stock.pop();
    card.faceUp = true;
    state.waste.push(card);
    state.selected = null;
  } else if (state.waste.length > 0) {
    while (state.waste.length > 0) {
      const card = state.waste.pop();
      card.faceUp = false;
      state.stock.push(card);
    }
    state.selected = null;
  }
  render();
}

function revealLastTableauCard(pileIndex) {
  const pile = state.tableau[pileIndex];
  if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
    pile[pile.length - 1].faceUp = true;
  }
}

function tryAutoMoveToFoundation(source) {
  let card;

  if (source.type === "waste") {
    if (state.waste.length === 0) {
      return false;
    }
    card = state.waste[state.waste.length - 1];
  } else if (source.type === "tableau") {
    const pile = state.tableau[source.pileIndex];
    if (pile.length === 0 || source.cardIndex !== pile.length - 1) {
      return false;
    }
    card = pile[source.cardIndex];
    if (!card.faceUp) {
      return false;
    }
  } else {
    return false;
  }

  const targetIndex = state.foundations.findIndex((pile) => canMoveToFoundation(card, pile));
  if (targetIndex === -1) {
    return false;
  }

  if (source.type === "waste") {
    state.foundations[targetIndex].push(state.waste.pop());
  } else {
    const moved = state.tableau[source.pileIndex].pop();
    state.foundations[targetIndex].push(moved);
    revealLastTableauCard(source.pileIndex);
  }

  state.selected = null;
  checkWin();
  render();
  return true;
}

function selectWaste() {
  if (state.waste.length === 0) {
    return;
  }
  const selection = { type: "waste" };
  if (!tryAutoMoveToFoundation(selection)) {
    state.selected = selection;
    state.message = "Selected waste card";
    render();
  }
}

function isValidSequence(cards) {
  for (let i = 0; i < cards.length - 1; i += 1) {
    if (cards[i].rank !== cards[i + 1].rank + 1 || cardColor(cards[i]) === cardColor(cards[i + 1])) {
      return false;
    }
  }
  return true;
}

function selectTableauCard(pileIndex, cardIndex) {
  const pile = state.tableau[pileIndex];
  const card = pile[cardIndex];
  if (!card.faceUp) {
    if (cardIndex === pile.length - 1) {
      card.faceUp = true;
      render();
    }
    return;
  }

  const selection = { type: "tableau", pileIndex, cardIndex };
  if (cardIndex === pile.length - 1 && tryAutoMoveToFoundation(selection)) {
    return;
  }

  const movingCards = pile.slice(cardIndex);
  if (!isValidSequence(movingCards)) {
    state.message = "That card sequence cannot be moved.";
    state.selected = null;
    render();
    return;
  }

  state.selected = selection;
  state.message = "Selected tableau cards";
  render();
}

function moveSelectionToFoundation(foundationIndex) {
  if (!state.selected) {
    return;
  }

  let card;
  if (state.selected.type === "waste") {
    card = state.waste[state.waste.length - 1];
  } else if (state.selected.type === "tableau") {
    const pile = state.tableau[state.selected.pileIndex];
    if (state.selected.cardIndex !== pile.length - 1) {
      state.message = "Only top tableau cards can move to foundation.";
      render();
      return;
    }
    card = pile[pile.length - 1];
  } else {
    return;
  }

  const target = state.foundations[foundationIndex];
  if (!canMoveToFoundation(card, target)) {
    state.message = "Invalid move to foundation.";
    render();
    return;
  }

  if (state.selected.type === "waste") {
    target.push(state.waste.pop());
  } else {
    target.push(state.tableau[state.selected.pileIndex].pop());
    revealLastTableauCard(state.selected.pileIndex);
  }

  state.selected = null;
  state.message = "Moved card to foundation.";
  checkWin();
  render();
}

function moveSelectionToTableau(targetPileIndex) {
  if (!state.selected) {
    return;
  }

  const target = state.tableau[targetPileIndex];
  let movingCards = [];

  if (state.selected.type === "waste") {
    if (state.waste.length === 0) {
      return;
    }
    movingCards = [state.waste[state.waste.length - 1]];
  } else if (state.selected.type === "tableau") {
    const sourcePile = state.tableau[state.selected.pileIndex];
    if (state.selected.pileIndex === targetPileIndex) {
      state.selected = null;
      state.message = "Selection cleared.";
      render();
      return;
    }
    movingCards = sourcePile.slice(state.selected.cardIndex);
  }

  const firstCard = movingCards[0];
  if (!canMoveToTableau(firstCard, target)) {
    state.message = "Invalid move to tableau.";
    render();
    return;
  }

  if (state.selected.type === "waste") {
    target.push(state.waste.pop());
  } else {
    const sourcePile = state.tableau[state.selected.pileIndex];
    const moved = sourcePile.splice(state.selected.cardIndex);
    target.push(...moved);
    revealLastTableauCard(state.selected.pileIndex);
  }

  state.selected = null;
  state.message = "Moved cards to tableau.";
  render();
}

function checkWin() {
  const count = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (count === 52) {
    state.message = "You won! Start a new game to play again.";
  }
}

function makeCardEl(card, { top = 0, selected = false } = {}) {
  const cardEl = document.createElement("div");
  cardEl.className = `card ${card.faceUp ? "" : "back"} ${cardColor(card)} ${selected ? "selected" : ""}`.trim();
  cardEl.style.top = `${top}px`;
  cardEl.textContent = card.faceUp ? `${RANKS[card.rank - 1]}${card.suit}` : "";
  return cardEl;
}

function renderStock() {
  stockEl.innerHTML = "";

  if (state.stock.length > 0) {
    const top = state.stock[state.stock.length - 1];
    const back = makeCardEl({ ...top, faceUp: false });
    stockEl.appendChild(back);
  } else {
    const span = document.createElement("span");
    span.textContent = state.waste.length ? "↺" : "∅";
    span.style.fontSize = "2rem";
    stockEl.appendChild(span);
  }
}

function renderWaste() {
  wasteEl.innerHTML = "";
  if (state.waste.length === 0) {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    wasteEl.appendChild(placeholder);
    return;
  }

  const top = state.waste[state.waste.length - 1];
  const isSelected = state.selected?.type === "waste";
  wasteEl.appendChild(makeCardEl(top, { selected: isSelected }));
}

function renderFoundations() {
  foundationsEl.innerHTML = "";
  state.foundations.forEach((pile, index) => {
    const foundationEl = document.createElement("button");
    foundationEl.type = "button";
    foundationEl.className = "pile foundation";
    foundationEl.setAttribute("aria-label", `Foundation ${index + 1}`);
    foundationEl.addEventListener("click", () => moveSelectionToFoundation(index));

    if (pile.length > 0) {
      foundationEl.appendChild(makeCardEl(pile[pile.length - 1]));
    } else {
      const suit = document.createElement("span");
      suit.textContent = "A";
      suit.style.opacity = "0.6";
      suit.style.fontSize = "1.5rem";
      foundationEl.appendChild(suit);
    }

    foundationsEl.appendChild(foundationEl);
  });
}

function renderTableau() {
  tableauEl.innerHTML = "";

  state.tableau.forEach((pile, pileIndex) => {
    const pileEl = document.createElement("button");
    pileEl.type = "button";
    pileEl.className = "tableau-pile";
    pileEl.setAttribute("aria-label", `Tableau pile ${pileIndex + 1}`);
    pileEl.addEventListener("click", () => moveSelectionToTableau(pileIndex));

    if (pile.length === 0) {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      pileEl.appendChild(placeholder);
    }

    pile.forEach((card, cardIndex) => {
      const isSelected =
        state.selected?.type === "tableau" &&
        state.selected.pileIndex === pileIndex &&
        cardIndex >= state.selected.cardIndex;

      const cardEl = makeCardEl(card, {
        top: cardIndex * 28,
        selected: isSelected,
      });
      cardEl.addEventListener("click", (event) => {
        event.stopPropagation();
        selectTableauCard(pileIndex, cardIndex);
      });
      pileEl.appendChild(cardEl);
    });

    tableauEl.appendChild(pileEl);
  });
}

function render() {
  renderStock();
  renderWaste();
  renderFoundations();
  renderTableau();
  statusEl.textContent = state.message;
}

stockEl.addEventListener("click", drawFromStock);
wasteEl.addEventListener("click", selectWaste);
newGameEl.addEventListener("click", startGame);

startGame();
