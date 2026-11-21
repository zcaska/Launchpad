# Reference-matched Castle artwork

User correction: replicate the two supplied visual references closely. This supersedes the earlier flat SVG visual direction; economy decisions and saved IDs remain unchanged.

Built-in imagegen produced the production artwork from the supplied screenshot references. Master PNGs remain under the tool's generated_images directory. Scene JPEGs preserve original dimensions and use quality94 encoding to reduce the two scene plates from 4.4MB to 880KB combined.

- `public/assets/castle/fortress-complete.jpg`: detailed emerald-bannered, torchlit medieval stronghold, mountain night landscape, waterfalls and central staircase. Prompt: faithfully recreate only the completed castle scenic illustration from reference2, no UI/text/cards, same perspective, intricate realistic game concept art.
- `public/assets/castle/fortress-shadow.jpg`: matching unbuilt shadow plate. Prompt: retain the completed scene's exact camera, geometry and background; make castle dark teal silhouette without window/torch lights; preserve alignment for purchase-region reveals.
- `public/assets/castle/store-atlas.png`: 3-column/2-row game-prop atlas. Prompt: reference1-style isometric lavender stone wall, purple-roof tower, arched portcullis; roof, gold/purple banner, flame pedestal; no text, equal cells.

Scene construction masks share a fixed SVG coordinate system with both image plates, so responsive cropping cannot shift purchased regions relative to architecture. Unknown historical IDs do not reveal extra construction. No income, ownership or balances are encoded in artwork.
