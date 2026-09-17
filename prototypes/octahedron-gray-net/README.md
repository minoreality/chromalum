# Octahedron Gray-code net

Research scratch for one question: what the chromatic octahedron looks like when its
eight faces are unfolded in Gray-code order, and which unfolding is the right one to
draw. Nothing here is imported by the app or by the Theory tab, and nothing here is a
new claim — it is a rendering of duality and ordering facts the repository already
holds in `src/data/theory-data.ts` and `src/components/theory/octahedron-dual-geometry.ts`.

Run from the repository root:

```powershell
node prototypes/octahedron-gray-net/net.mjs
```

The script prints every check it makes and rewrites `octahedron-gray-net.svg` beside
itself. It reads `src/data/theory-data.ts` to cross-check the duality, so it fails
loudly rather than silently drifting if that table is edited.

## What the figure shows

Each triangle is one octahedron face, filled with its dual cube vertex and labelled
with that vertex's `GRB` word. The small corner dots are the octahedron's own
vertices, the chromatic six. Thick coloured seams mark which channel flips when you
cross that gluing, and the dashed seam is the one gluing a net has to cut.

The face colour is the sum of the primaries among its three corners. A face takes one
vertex per axis, each axis holds exactly one primary and one secondary, and the
primary is the member whose channel bit is set — so the three corners vote on the
three channels, one each. The count of primary corners is the weight of the face
colour, which is why the all-primary face is `W` and the all-secondary face is `K`.

## What the script verifies

| Fact                                                          | Value |
| ------------------------------------------------------------- | ----- |
| Spanning trees of the face graph, i.e. labelled nets          | 384   |
| Of those, path-shaped, the only kind that carries a Gray code | 72    |
| Of those, a cyclic Gray code with one gluing cut              | 48    |
| Distinct shapes among the 48, up to congruence                | 2     |

It also checks that the face graph is `Q3`; that the repository's own face colours obey
the primary-sum rule; that the chosen tour glues edge to edge all the way round; that
every gluing flips exactly one channel; that the linear flip sequence is a palindrome;
that the eight triangles lie flat without overlapping; that the second half of the net
is the first half translated by a single vector; and that opposite faces on the solid
carry complementary colours.

## Why this unfolding

Only path-shaped nets can show a Gray code, because a branching net has no single
walk to read. Among the 48 that come from a cyclic Gray code there are two shapes,
separated by where the cycle is cut. Cutting the slow channel gives the palindromic
flip sequence `B R B G B R B`, which renders the reflected Gray code's own recursion:
a two-bit Gray code on `B` and `R`, one flip of `G` in the middle, then the same
two-bit code reversed. The other cut is more compact but hides that structure.

The walk is `K B M R Y W C G`, the textbook reflected Gray code with the rightmost
digit running fastest. Which digit runs fastest is a free choice; the cube graph has
six Hamiltonian cycles, two for each digit. Channel counts of `4, 2, 2` are forced,
because eight steps over three channels cannot be split evenly with every count even
and non-zero. One level down the chromatic six-cycle does split evenly, at two each.

## The band

`octahedron-gray-band.svg` is the same net with the walk continued instead of stopped.
Because the second half of the net is the first half translated, the unfolding never
closes and never overlaps, so the eight-face net is the repeating unit of a band that
runs forever. The script checks 32 triangles for overlap and finds none.

This is the better way to show the palindrome. In the finite net the mirror is a
property you read off the printed flip row; in the band it is an actual symmetry of
the drawing. Every `G` seam and every `R` seam lies on a mirror line of the whole
band, and reflecting across one of them is exactly the inversion of that channel.
`B` seams are not mirrors. Composing a `G` mirror with an `R` mirror gives the
translation, whose colour effect is `xor Y`, which is why `Y` is the constant offset
between a triangle and the fourth one along.

The geometric period is four triangles; the colours only come back after eight,
because applying `xor Y` twice is the identity.

## The plane

`octahedron-gray-plane.svg` takes one more step. Slide a copy of the band sideways by a
single triangle side and the copies interlock, so the net tiles the whole plane with no
overlaps and no gaps. The script checks both against the unit triangular grid.

The colours survive the move. Every two triangles that share an edge differ in exactly
one channel, anywhere in the plane, not just along a band. Crossing the join between two
bands always inverts `B`, the fast channel, while travelling along a band runs the
`B R B G` sequence. So the whole sheet is a Gray-code colouring in two directions rather
than one.

The colouring repeats on the lattice spanned by the sideways slide and twice the band
translation. That cell is eight unit triangles and holds all eight colours exactly once,
which is the white outline in the figure.

## Which nets tile, and which keep the colours

The band is not the only net that tiles. Taking all 384 nets, flattening each, and asking
whether it tiles the plane by translations and whether the colouring survives the joins
narrows it sharply.

| Question                                      | Labelled nets | Shapes up to congruence |
| --------------------------------------------- | ------------- | ----------------------- |
| Lies flat without overlapping                 | 384           | 11                      |
| Also tiles the plane by translations          | 96            | 6                       |
| Also keeps the one-bit rule across every join | 32            | 2                       |
| The same, but a lattice step may xor a copy   | 40            | 5                       |

The 11 is the classical number of octahedron nets, which the script reproduces from
scratch rather than assuming, so it doubles as a check on the unfolding code.

The last row is the important caveat. The count is not a property of the octahedron on its
own; it depends on how strictly the colouring is required to repeat. Demanding that every
copy carry identical colours leaves 2 shapes. Allowing each step along a lattice generator
to xor the whole copy by a fixed mask, which is still a perfectly periodic pattern, leaves
5, and two of those five are branched trees rather than strips. Widening further, to
tilings built from rotations or reflections rather than translations alone, is not tested
here and could only raise the number again. So "only two" is a statement about the rule
chosen, not about the solid.

The two shapes of the stricter rule are strips of eight triangles cut from a cyclic Gray code, and they
are the same two shapes the earlier section counts. They are not two objects: they are two
windows onto the same infinite band. Slide the eight-triangle window one triangle along and
the first shape becomes the second. The band's geometric period is four triangles, so there
are four window positions, alternating between the two shapes.

Only one of them has a palindromic flip sequence, and that is the one drawn in the figures,
because the palindrome is what makes the reflected Gray code's recursion visible inside the
picture rather than off its edge. The other is slightly more compact and carries nothing the
first one lacks.

So the colour condition cuts 11 shapes down to 2 but does not pick a unique net. The last
step from 2 to 1 is a presentation choice, not a mathematical one, and should not be read
as though the structure singled the net out.

## What the tiling carries, and what it does not

Beyond the one-bit rule, the coloured plane was checked against the other structures in
the model. The results split cleanly.

It carries the bit parity. In every one of the five colourings, triangles pointing one way
take the four even-weight colours `K M C Y` and triangles pointing the other way take the
four odd-weight `B R G W`. That is forced: adjacency on the triangular grid always joins
opposite orientations, and a one-bit step always flips weight parity. Those two sets are
the two inscribed tetrahedra, the stella octangula already in the Theory tab.

It carries symmetry. Every one of the five has 180-degree rotation centres. The three strip
shapes also have mirror lines; the two branched ones have none. The colour action of the
symmetry group is always a Klein four-group of order four, and it is always the subgroup
that leaves one channel alone, the fast one.

It does not carry the complement. In none of the five is the complement realised by any
symmetry of the plane. The reason is the line above: the symmetry group's colour action
misses one channel, and the complement needs all three.

It does not carry mixing. A triangle is not the join, the meet, or the XOR of its three
neighbours, in any of the five. There is no local algebraic rule of that kind to find.

Tone moves by exactly one channel weight per step, which the one-bit rule already forces.
The drawn tiling is the tightest of the five on that measure: every triangle has two of its
three neighbours one Tone step away, with gap profiles `1,1,2` and `1,1,4` only, where the
branched ones spread as far as `2,4,4`.

## Edges and nodes

`octahedron-gray-plane-rich.svg` puts something on the edges and the corners as well as
the faces. The plain plane figure shows the lattice and the period; this one shows what
each part of the tiling carries.

Edges take a colour cleanly. An edge separates two faces, so its natural label is their
XOR, and by the one-bit rule that is always a single channel, the one that flips when you
cross. Note that this is not the clash described in the next section: there the edge joined
two octahedron vertices, here it separates two faces, so XOR and flipped channel agree.

Corners do not, and this is the trap. A triangle in a net has three labelled corners, so it
is tempting to carry them through. They do not survive: of 414 interior corners in the
patch, not one receives a single octahedron label. Six triangles meet at a point of the
plane while only four meet at a vertex of the solid, so the labels must clash. Drawing them
would show a colour where none is defined.

What a corner does carry is the channel its six surrounding faces hold fixed. Every corner
is ringed by exactly the four colours that share one channel value, so a corner is a place
where one channel is constant. There are four kinds, `G=0`, `G=1`, `R=0` and `R=1`, and `B`
never appears. The fast channel is the one no corner holds fixed, which is the same bias
that made the `B` seams the only ones that are not mirrors.

## One convention clash with the Theory tab

The solid being unfolded is the Color Diamond, `theory_chromatic_octa_title`, and the
small corner dots are its six vertices. But the two figures colour the same twelve
edges by different rules, so they do not match by eye.

`ChromaticOctahedron` strokes an edge with the XOR of its two endpoints. This prototype
strokes a seam with the channel that flips when you cross it. Those agree on exactly
half the edges, and the rule is:

- exactly one endpoint a primary: the XOR colour is the flipped channel
- both endpoints primaries, or both secondaries: the two are complements

Verified on all twelve edges. The flip colouring is the right one here, because the
figure is about the Gray code rather than about the edges themselves, but anyone
putting the two figures side by side should expect the mismatch.

## Scope

This is duality of labels and adjacency, not a statement about geometry, perception,
or mixing. The eight-face level is not a third rung of the vertices-then-edges ladder
in `docs/algebraic-color-model.md`: covering faces one at a time is a Hamiltonian
cycle, the same kind of statement as the vertex level, and the mask block stops being
a permutation of the mask set. That ladder stops at two rungs.
