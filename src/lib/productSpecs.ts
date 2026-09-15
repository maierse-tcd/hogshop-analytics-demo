// Product facts for consumable products (food, treats, mealworms).
//
// Shoppers ask for ingredients, protein, and feeding guidance before they buy.
// The product page and the AI chat both answer from these same facts, so keep
// them in sync with the food replies in supabase/functions/ai-chat/index.ts.
//
// Keyed by product image_url, the stable identifier the catalog already uses.

export interface ProductSpec {
  // Guaranteed analysis rows, shown as a spec table.
  analysis: { label: string; value: string }[];
  // Full ingredient statement.
  ingredients: string;
  // How much to feed and how often.
  feeding: string;
  // Where the ingredients come from.
  sourcing?: string;
}

export const productSpecs: Record<string, ProductSpec> = {
  "hedgehog-food.jpg": {
    analysis: [
      { label: "Crude protein", value: "32% minimum" },
      { label: "Crude fat", value: "14%" },
      { label: "Crude fiber", value: "6% maximum" },
      { label: "Moisture", value: "9% maximum" },
    ],
    ingredients:
      "Chicken meal, dried mealworms, brown rice, chicken fat, dried egg, salmon oil, dried cranberries, and added vitamins and minerals. No dairy, no grapes or raisins, and no added sugar.",
    feeding:
      "Feed 1 to 2 tablespoons per adult hedgehog each evening. Adjust the amount to keep a healthy weight. Give fresh water at all times.",
    sourcing: "We farm the insect protein in the EU and dry it. We do not use live insects.",
  },
  "hedgehog-mealworms.jpg": {
    analysis: [
      { label: "Crude protein", value: "53%" },
      { label: "Crude fat", value: "28%" },
    ],
    ingredients: "100% dried mealworms. No additives or preservatives.",
    feeding:
      "Feed 3 to 5 mealworms as an occasional treat. A treat pack is not a full meal, so pair it with a complete hedgehog food.",
    sourcing: "We farm the mealworms and freeze-dry them to lock in the protein.",
  },
  "hedgehog-treats.jpg": {
    analysis: [
      { label: "Crude protein", value: "30% minimum" },
      { label: "Crude fat", value: "12%" },
    ],
    ingredients:
      "Dried insects, sweet potato, and dried egg. No dairy, no grapes or raisins, and no added sugar.",
    feeding:
      "Give a few treats a day for variety. Treats add to the daily diet. They do not replace a complete hedgehog food.",
  },
};
