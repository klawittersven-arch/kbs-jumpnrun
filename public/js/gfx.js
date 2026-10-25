// Grafik von „KBS Jump-'n'-Run!“: alle Figuren, Kacheln und Hintergründe werden im Code gezeichnet.
// drawWorld zeichnet ein Level in eine Leinwand beliebiger Breite: 256 px auf dem Handy, breiter am Beamer.
(function () {
  "use strict";
  const E = window.JRE;
  const T = E.T, VH = E.VH, ROWS = E.ROWS, SOLID = E.SOLID;

  // ---------------------------------------------------------------- Spielfigur: die Krankenschwester
  // Ein Chibi-Sprite nach der Figur aus „Diabetes Run!“. Alle Bilder liegen auf einer 24 px breiten Leinwand: der Kopf
  // bleibt stehen, die Mitte der Trefferfläche ist die Mitte der Leinwand und NURSE_GROUND ist die Zeile, auf der die
  // Füße stehen. Laufen hat vier Bilder; das hintere Bein ist schattiert, so wechseln sich die Beine sichtbar ab.
  const NURSE_GROUND = { small: 29, big: 32 };
  const NURSE_ART = {
    small: {
      stand: [
        "........................",
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWKKKWOO.......",
        "........OWWWKKWWO.......",
        ".......OFOwwWWWOFO......",
        ".......OFOwWWWWOFO......",
        ".......OFOKKKKKOFO......",
        ".......OFOwWWWWOFO......",
        "........OwwWWWWWO.......",
        "........OwWWWWWWO.......",
        ".........OwwOggO........",
        ".........OWWOggO........",
        ".........OWWOggO........",
        "........OkKKOkKKO.......",
        "........OkkkOkkkO.......",
        "........................",
        "........................",
      ],
      run1: [
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWKKWO........",
        "......OOFWWWWKWWO.OO....",
        ".....OFFOwOwWWWOFOFFO...",
        "....OFFOOOOwWWWOFFFFO...",
        "....OFFO.OKKKKKOOFFO....",
        ".....OO.OwWWWWWO.OO.....",
        ".......OwwWWWWWWO.......",
        "........OwwwWWWWO.......",
        "......OOggOOOwwO........",
        ".....OgggO...OWWO.......",
        "....OkggO....OWWOOO.....",
        "....OkkO......OWKKKO....",
        "....OkkO......OkkKKO....",
        ".....OO........OOOO.....",
        "........................",
        "........................",
      ],
      run2: [
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWKKWOO.......",
        "........OWWwWKWWO.......",
        ".......OFFOOwWWOFOO.....",
        "......OFFOOwWWWOFFFO....",
        "......OFFOKKKKKOOFFO....",
        ".......OOwwWWWWWOOO.....",
        "........OwWWWWWWWO......",
        ".......OwWWWwwwOO.......",
        "........OOggOwwO........",
        ".........OggOwwO........",
        "........OkgOwwO.........",
        "........OkkOKKO.........",
        ".........OkkOkKO........",
        ".........OOO.OOO........",
        "........................",
        "........................",
      ],
      run3: [
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWKKWO........",
        ".......OOWwWWKWWO.OO....",
        "......OFFOwWwWWwOOFFO...",
        ".....OFFOOOwWWWOFFFFO...",
        "....OFFO.OKKKKKOFFOO....",
        "....OFFO.OwWWWwO.O......",
        ".....OO.OwWWWWWWO.......",
        ".......OwwWwWWWWO.......",
        ".......OOWWOOggO........",
        "......OWWWO..OggO.......",
        ".....OKWWO...OgggOO.....",
        ".....OKKO.....OgkkkO....",
        ".....OKKO.....OkkkkO....",
        "......OO......OOOOO.....",
        "........................",
        "........................",
      ],
      run4: [
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWKKWO........",
        ".......OOWWwWKWWO.......",
        "......OFFwOwWWWOFOO.....",
        ".....OFFOOOwWWWOFFFO....",
        ".....OFFOOKKKKKOOFFO....",
        "......OO.OwWWWWO.OO.....",
        "........OwwWWWWWO.......",
        ".......OwwWWWwwwO.......",
        "........OOWggggO........",
        ".........OWgOggO........",
        "........OKWOOggO........",
        "........OKKOOkkO........",
        "........OOKO.OkkO.......",
        ".........OO..OkkO.......",
        "..............OOO.......",
        "........................",
        "........................",
      ],
      jump: [
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFOOO..",
        ".....OOHHHHFFFFFFFOFFO..",
        "......OOHHHFFFFFOOOFFFO.",
        "........OOWWKKWOOWFFFO..",
        ".......OFWWwWKWWOWFOO...",
        "......OFFwOwwWWWOOO.....",
        ".....OFFOOOwWWWO........",
        ".....OFFO.OKKKKKO.......",
        "......OO.OwWWWWWwO......",
        ".........OwWWWWOWWO.....",
        "........OwwWWWOWWO......",
        ".........OwwOOKKO.......",
        ".........OwWOOKKO.......",
        ".........OWWO.OKO.......",
        "........OWWO...O........",
        "........OKKO............",
        "........OKKO............",
        ".........OKO............",
        "..........O.............",
      ],
      fall: [
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWKKWOO.......",
        ".......OFWWWWKWWOO......",
        ".....OOFFwOwwWWOWFOO....",
        "....OFFFOOOwWWWOOFFFO...",
        "....OFFO..OKKKKO.OFFO...",
        ".....OO..OwWWWWO..OO....",
        "........OwwWWWWWO.......",
        "........OwwwWWWWO.......",
        ".........OwWOggO........",
        ".........OWWOggO........",
        "........OKWO.OkKO.......",
        "........OKKkO.OkO.......",
        ".........OKKO.OkO.......",
        ".........OKKO..O........",
        "..........OO............",
        "........................",
      ],
      skid: [
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        ".............OOOOOO.....",
        "............OwWWWWWO....",
        "...........OwWWWKWWWO...",
        "...........OwWWKKKWWO...",
        "..........OHwwWWKWWWO...",
        ".........OHHHwWWWWWHHO..",
        "........OhHHHHHHHHHHHHO.",
        ".......OhHHHHHHFFFFFHHO.",
        "......OhhHHHHHFFFFFFFFO.",
        "......OhFFFHHHFFFOFFOFO.",
        "......OhFFFHHHFFFOFFOFO.",
        ".......OOhHHHHFFcFFcFFO.",
        "........OOHHHHFFFFFFFO..",
        "..........OOWWKKFFFOO...",
        "..........OwWWKKFOO.....",
        ".........OwWwwWKOFOO....",
        "........OKKKOFFFOFFFO...",
        ".......OwWWWWOFFFOFFO...",
        "......OwwWWWWWOOO.......",
        ".....OwggOOOOOwwO.......",
        "...OOWWwO....OwwO.......",
        "..OKWWOO.....OwwO.......",
        ".OKKKO......OkkKKO......",
        ".OOOOO......OOOOOO......",
        "........................",
        "........................",
      ],
    },
    big: {
      stand: [
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWKKKWO.......",
        "........OWWWWKKWWO......",
        ".......OFWWwWWWWwwO.....",
        ".......OFFOwwWWWOFO.....",
        "......OFFOOwWWWWOFFO....",
        "......OFFOKKKKKKOFFO....",
        "......OFFOwwWWWWOFFO....",
        "......OFFOwWWWWWWOFO....",
        ".......OOOwWWWWWWOO.....",
        "........OWWWWWWWWO......",
        ".........OwwwOggO.......",
        ".........OWWWOggO.......",
        ".........OWWWOggO.......",
        ".........OWWOOggO.......",
        ".........OWWOOggO.......",
        "........OKKKKOkkkkO.....",
        "........OkKKKOkkkkO.....",
        "........OOOOO.OOOOO.....",
        "........................",
        "........................",
      ],
      run1: [
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWKKKWO.......",
        "........OWWWWKKWWO......",
        "......OOFWOWWWWWOFOOOO..",
        ".....OFFOWOwWWWWOFOOFFO.",
        "....OFFFOOOwWWWOOFFFFFO.",
        "...OFFFO..OKKKKOOOFFFO..",
        "...OFFFO.OwWWWWOO.OOO...",
        "....OOO.OwwWWWWWO.......",
        "........OwWWWWWWO.......",
        ".......OwWWWWWWWWO......",
        ".......OOggOOwwwO.......",
        "......OOggO..OWWWO......",
        "....OOgggO....OWWO......",
        "...OkkggO.....OWWOO.....",
        "...OkkkO......OWWWOOO...",
        "...OkkkO.......OWWKKKO..",
        "...OkkkO.......OkkKKKO..",
        "....OOO.........OOOOO...",
        "........................",
        "........................",
      ],
      run2: [
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWWKKWO.......",
        "........OWWWWWKWWO......",
        ".......OFwWOWWWWOwO.....",
        "......OFFFOOwWWWOFOO....",
        ".....OOFFOOwwWWWOFFFO...",
        ".....OOFFOOKKKKKOOFFO...",
        ".......OOOwwWWWWWOOO....",
        "........OwwWWWWWWWO.....",
        "........OwwWWWWWWWO.....",
        ".......OWWWWWWwwOO......",
        "........OOgggOwWO.......",
        ".........OgggOWWO.......",
        ".........OggOWWO........",
        "........OkgOOWWO........",
        "........OkkOKKKO........",
        "........OkkOKKKO........",
        ".........OkkOKKO........",
        ".........OOO.OOO........",
        "........................",
        "........................",
      ],
      run3: [
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        "........OOWWKKKOO.......",
        "........OWWWWKKWO.......",
        ".......OOFWwWWWWWO.OO...",
        "......OFFOOwwWWOFOOFFO..",
        ".....OFFOOOwWWWOFFFFFO..",
        "....OFFO..OKKKKOOFFOO...",
        "....OFFO.OwWWWWOOOO.....",
        ".....OO..OwWWWWWO.......",
        "........OwwWWWWWWO......",
        ".......OOWWWOgggO.......",
        ".......OWWWO.OgggO......",
        "......OWWWO..OgggO......",
        ".....OWWWO....OggO......",
        "....OKWWO......OggOOO...",
        "....OKKKO......OggkkkO..",
        "....OKKKO......OkkkkkO..",
        ".....OOO.......OOOOOO...",
        "........................",
        "........................",
      ],
      run4: [
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        ".........OOWWKKWOO......",
        "........OOWWWWKWWO......",
        ".......OFFWOWWWWOFO.....",
        "......OFFFOOwWWWOFOOO...",
        ".....OFFOOOKKKKKOFFFFO..",
        ".....OFFO.OwWWWWOOFFFO..",
        "......OO..OwWWWWWO.OO...",
        ".........OwWWWWWWWO.....",
        "........OwwWWWwwwO......",
        ".........OOWWOggO.......",
        "..........OWWOggO.......",
        ".........OKWWOggO.......",
        "........OKKWOggO........",
        "........OKKKOggO........",
        "........OKKKOkkO........",
        ".........OKKOkkkO.......",
        "..........OOOOkkO.......",
        ".............OOO........",
        "........................",
        "........................",
      ],
      jump: [
        "........................",
        "........................",
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFOOO..",
        ".....OOHHHHFFFFFFFOOFFO.",
        "......OOHHHFFFFFOOOFFFO.",
        "........OOWWKKWOOFFFFO..",
        ".......OOWWwWKWWWWFOO...",
        ".....OOFFWOwWWWWWOO.....",
        "....OFFFOOOwWWWOO.......",
        "....OFFO..OKKKKKOO......",
        ".....OO..OwWWWWWWWO.....",
        "........OwwWWWWwWWO.....",
        "........OwWWWOOWWO......",
        "........OOwwOOKKO.......",
        ".........OwWOOKKO.......",
        ".........OWWO.OKO.......",
        "........OWWO...O........",
        "........OWWO............",
        ".......OKWO.............",
        ".......OKKO.............",
        "........OKO.............",
        ".........O..............",
      ],
      fall: [
        "........................",
        "........................",
        "..........OOOOOO........",
        ".........OwWWWWWO.......",
        "........OwWWWKWWWO......",
        "........OwWWKKKWWO......",
        "........OwwWWKWWWO......",
        ".......OHHwWWWWWHHO.....",
        "......OHHHHHHHHHHHHO....",
        ".....OhHHHHHFFFFFHHO....",
        "....OhhHHHHFFFFFFFFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhFFHHHFFFOFFOFO....",
        "....OhhHHHHFFcFFcFFO....",
        ".....OOHHHHFFFFFFFO.....",
        "......OOHHHFFFFFOO......",
        ".........OOWWKKWOO......",
        ".......OOFWWWWKWWOOO....",
        ".....OOFFFWOwWWWOWFFOO..",
        "....OFFFFOOOwWWWOOFFFFO.",
        "....OFFO...OKKKKO..OFFO.",
        ".....OO...OwWWWWO...OO..",
        ".........OwwWWWWWO......",
        "........OwwwWWWWWWO.....",
        ".........OOwwOOggOO.....",
        "..........OwWOOggO......",
        "..........OWWOOggO......",
        "..........OWO..OggO.....",
        ".........OkKO..OkkO.....",
        ".........OKKKO..OkO.....",
        "..........OKKO...O......",
        "..........OKKO..........",
        "...........OO...........",
        "........................",
      ],
      skid: [
        "........................",
        "........................",
        "........................",
        "........................",
        ".............OOOOOO.....",
        "............OwWWWWWO....",
        "...........OwWWWKWWWO...",
        "...........OwWWKKKWWO...",
        "..........OHwwWWKWWWO...",
        ".........OHHHwWWWWWHHO..",
        "........OhHHHHHHHHHHHHO.",
        ".......OhHHHHHHFFFFFHHO.",
        "......OhhHHHHHFFFFFFFFO.",
        "......OhFFFHHHFFFOFFOFO.",
        "......OhFFFHHHFFFOFFOFO.",
        ".......OOhHHHHFFcFFcFFO.",
        "........OOHHHHFFFFFFFO..",
        "..........OOWWKKFFFOO...",
        "..........OwWWKKFOO.....",
        ".........OwWwwWKOFOO....",
        "........OKKKOFFFOFFFO...",
        ".......OwWWWWOFFFOFFO...",
        "......OwwWWWWWOOO.......",
        "......OwwWWWWWOOO.......",
        ".....OwggOOOOOwwO.......",
        "....OWWwO....OwwO.......",
        "...OWWwO.....OwwO.......",
        "...OWWO......OwwO.......",
        "..OWWO.......OwwO.......",
        "..OKWO.......OwwO.......",
        ".OKKKO......OkkKKO......",
        ".OOOOO......OOOOOO......",
        "........................",
        "........................",
      ],
    },
  };
  const FRAMES = ["stand", "run1", "run2", "run3", "run4", "jump", "fall", "skid"];
  // vier Farben für bis zu vier Spieler: Weiß, Blau, OP-Grün und Rosa in Pastelltönen (Kleid und Haube);
  // ui ist die kräftigere Farbe für Namen und Markierungen am Beamer
  const BASE_PAL = { O: "#1C1525", W: "#FFFFFF", w: "#DCE3E7", g: "#BEC7CE", K: "#F76892", k: "#D34677", H: "#964536", h: "#702F26", F: "#FCD2B5", c: "#FAA2A8" };
  const COLORS = [
    { name: "Weiß", ui: "#f4f6fb", pal: {} },
    { name: "Blau", ui: "#7fbaf2", pal: { W: "#CFE6FB", w: "#A9CDF2", g: "#8FB6DF" } },
    { name: "OP-Grün", ui: "#5fd0b0", pal: { W: "#BDEBDB", w: "#93D3BD", g: "#7BBEA6" } },
    { name: "Rosa", ui: "#f59bbe", pal: { W: "#FBD5E3", w: "#F2B4CC", g: "#E49DB8", K: "#D9366B", k: "#A52352" } },
  ];

  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  function spriteFrom(rows, pal, height = 16, width = 16) {
    const c = canvas(width, height);
    const x = c.getContext("2d");
    rows.forEach((row, y) => {
      for (let i = 0; i < Math.min(width, row.length); i++) {
        const col = pal[row[i]];
        if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
      }
    });
    return c;
  }
  // ein Pixel Umriss um ein Sprite, damit es auf jedem Hintergrund auffällt; ab Zeile noBelow keiner (dort ist der Boden)
  function outlined(src, color, noBelow) {
    const c = canvas(src.width, src.height);
    const x = c.getContext("2d");
    x.drawImage(src, 0, 0);
    const { data } = x.getImageData(0, 0, c.width, c.height);
    const solid = (i, j) => i >= 0 && j >= 0 && i < c.width && j < c.height && data[(j * c.width + i) * 4 + 3] > 0;
    x.fillStyle = color;
    for (let j = 0; j < Math.min(noBelow, c.height); j++) {
      for (let i = 0; i < c.width; i++) {
        if (!solid(i, j) && (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1))) x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }
  function flipped(src, vertical) {
    const c = canvas(src.width, src.height);
    const x = c.getContext("2d");
    if (vertical) { x.translate(0, src.height); x.scale(1, -1); } else { x.translate(src.width, 0); x.scale(-1, 1); }
    x.drawImage(src, 0, 0);
    return c;
  }
  // die große Form (nach einem Kristall) ist größer; wer getroffen wird, fällt kopfüber aus dem Bild
  function nurseSet(pal) {
    const set = { small: {}, big: {} };
    for (const size of ["small", "big"]) {
      for (const k of FRAMES) {
        const rows = NURSE_ART[size][k], img = spriteFrom(rows, pal, rows.length, rows[0].length);
        set[size][k] = { 1: img, "-1": flipped(img) };
      }
    }
    set.dead = flipped(set.small.stand[1], true);
    return set;
  }
  const NURSES = COLORS.map((c) => nurseSet(Object.assign({}, BASE_PAL, c.pal)));

  // ---------------------------------------------------------------- Gegner
  const BEETLE = {
    a: ["", "", "", "", "", "", "", ".....kkkkkk.....", "...kkKKKKKKkk...", "..kKKyKKKKyKKk..", "..kKKKKKKKKKKk..", ".kKKKyKKKKyKKKk.", "hkkkkkkkkkkkkkk.", "hh.l...l...l....", "...l...l...l....", ""],
    b: ["", "", "", "", "", "", "", ".....kkkkkk.....", "...kkKKKKKKkk...", "..kKKyKKKKyKKk..", "..kKKKKKKKKKKk..", ".kKKKyKKKKyKKKk.", "hkkkkkkkkkkkkkk.", "hhl...l...l.....", "..l...l...l.....", ""],
    flat: ["", "", "", "", "", "", "", "", "", "", "", "", "", "..kkkkkkkkkkkk..", ".kKKyKKKKKyKKKk.", "kkkkkkkkkkkkkkkk"],
  };
  const BEETLE_PAL = { k: "#2a1d3f", K: "#7446b0", y: "#f0b43c", h: "#2a1d3f", l: "#2a1d3f" };
  const SNAIL = {
    a: ["", "", "..e...e", "..g...g", "...g.g...kkkk", "...ggg..kOOOOk", "..gegg.kOooooOk", ".ggggg.kOoOOoOk", ".ggggg.kOoOooOk", "..gggg.kOoooOOk", "...ggg.kOOOOOk", "...gggggkkkkkg", "..ggggggggggggg", ".gGgGgGgGgGgGgg", "", ""],
    b: ["", "", "...e...e", "...g...g", "...g.g...kkkk", "...ggg..kOOOOk", "..gegg.kOooooOk", ".ggggg.kOoOOoOk", ".ggggg.kOoOooOk", "..gggg.kOoooOOk", "...ggg.kOOOOOk", "...gggggkkkkkg", "..ggggggggggggg", ".GgGgGgGgGgGgGg", "", ""],
    shell: ["", "", "", "", "", "", "......kkkkk", ".....kOOOOOk", "....kOoooooOk", "....kOoOOOoOk", "....kOoOooOOk", "....kOooooOOk", "....kkOOOOOkk", ".....kkkkkkk", "", ""],
  };
  // der Körper der Schnecke ist rosa, das Gegenteil der Wiesengrüns, und bekommt einen Umriss
  const SNAIL_PAL = { k: "#3b2410", O: "#e0a050", o: "#9a5a22", g: "#f4b3cd", G: "#d97aa3", e: "#1a1d25" };
  function beetleSet(pal, rim) {
    const set = {};
    for (const k in BEETLE) {
      const left = rim ? outlined(spriteFrom(BEETLE[k], pal), rim, 15) : spriteFrom(BEETLE[k], pal);
      set[k] = { "-1": left, 1: flipped(left) };
    }
    set.dead = flipped(set.a[-1], true);
    return set;
  }
  function snailSet(rim) {
    const set = {};
    for (const k in SNAIL) { const left = outlined(spriteFrom(SNAIL[k], SNAIL_PAL), rim, 14); set[k] = { "-1": left, 1: flipped(left) }; }
    set.dead = flipped(set.shell[-1], true);
    return set;
  }

  // ---------------------------------------------------------------- Themen: Farben, Kacheln, Hintergründe
  // dark: dunkler Hintergrund (Gegner bekommen dort einen hellen Rand)
  const THEME = {
    meadow: { dark: false, beetle: BEETLE_PAL, rim: null, snailRim: "#3a1f2b", mini: "#7fb8e6", miniGround: "#6b4a2e", miniRock: "#8f929c", miniBrick: "#c98c4a",
      ground: ["#7b5233", "#5f3f26", "#93663f"], rock: ["#8f929c", "#b9bcc5", "#5f626c", "#6f727c"], brick: ["#c98c4a", "#7a4f26", "#e3ad6e"],
      hut: { wall: "#a8693a", roof: "#9a3f2e", edge: "#4a2414", door: "#5a3418", glass: "#f6d77a" }, water: ["#3f86c4", "#8fc6ee"], crumbs: ["#c98c4a", "#7a4f26"] },
    mine: { dark: true, beetle: Object.assign({}, BEETLE_PAL, { K: "#a274e6" }), rim: "#e3d6ff", snailRim: "#3a1f2b", mini: "#1d212c", miniGround: "#4a4e5c", miniRock: "#6a6f80", miniBrick: "#6b6680",
      ground: ["#363944", "#2a2c35", "#4a4e5c"], rock: ["#4a4e5c", "#6a6f80", "#2c2f3a", "#363944"], brick: ["#6b6680", "#2c2a38", "#8e89a6"],
      hut: { wall: "#6a4527", roof: "#4a5060", edge: "#22252e", door: "#3f2512", glass: "#f0b85a" }, water: ["#2f6fa8", "#7fb6e0"], crumbs: ["#6b6680", "#2c2a38"] },
    clinic: { dark: true, beetle: Object.assign({}, BEETLE_PAL, { K: "#b07ef0" }), rim: "#f2e8ff", snailRim: "#fde7f0", mini: "#1b2340", miniGround: "#7f93a8", miniRock: "#c8d3e0", miniBrick: "#e4ebf3",
      ground: ["#5d6f86", "#4b5b70", "#71849b"], rock: ["#c8d3e0", "#eef3f8", "#8d9bb0", "#aab7c8"], brick: ["#e4ebf3", "#9aa9bd", "#ffffff"],
      hut: { wall: "#e9eef5", roof: "#3d6fb0", edge: "#1e2a44", door: "#4f86c6", glass: "#fff1b0" }, water: ["#3a7cc0", "#9cd0f5"], crumbs: ["#e4ebf3", "#9aa9bd"] },
    glacier: { dark: false, beetle: Object.assign({}, BEETLE_PAL, { K: "#6a3fb0" }), rim: null, snailRim: "#3a1f2b", mini: "#cfe8f7", miniGround: "#9bb4c8", miniRock: "#a8dcef", miniBrick: "#d6ecf7",
      ground: ["#6f8aa3", "#5a7389", "#86a0b6"], rock: ["#a8dcef", "#e6f7fd", "#6fb2cf", "#8cc7de"], brick: ["#d6ecf7", "#8fb8cf", "#ffffff"],
      hut: { wall: "#8a5a34", roof: "#f4f8fb", edge: "#3b2414", door: "#5a3418", glass: "#ffd97a" }, water: ["#2a6f8f", "#9fe0f2"], crumbs: ["#ffffff", "#a8dcef"] },
    vineyard: { dark: false, beetle: BEETLE_PAL, rim: null, snailRim: "#3a1f2b", mini: "#f6d9a0", miniGround: "#8a4f2c", miniRock: "#b9a58a", miniBrick: "#d8b26e",
      ground: ["#8a4f2c", "#6d3b1f", "#a8653b"], rock: ["#b9a58a", "#d8c8ae", "#7e6c55", "#958267"], brick: ["#d8b26e", "#8a6532", "#f0d29a"],
      hut: { wall: "#c99a5e", roof: "#b5482f", edge: "#4a2414", door: "#6b3a1c", glass: "#ffe39a" }, water: ["#3f86c4", "#8fc6ee"], crumbs: ["#d8b26e", "#8a6532"] },
  };
  const BUGS = {}, SNAILS = {};
  for (const k in THEME) { BUGS[k] = beetleSet(THEME[k].beetle, THEME[k].rim); SNAILS[k] = snailSet(THEME[k].snailRim); }

  function canvas16(draw, w = 16, h = 16) {
    const c = canvas(w, h);
    const x = c.getContext("2d");
    draw(x, (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); });
    return c;
  }
  function hash(c, r) {
    let h = (c * 374761393 + r * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const CRYSTAL = canvas16((x, px) => {
    for (let y = 0; y < 14; y++) {
      const half = y < 5 ? y + 2 : Math.max(0, 13 - y);
      for (let i = -half; i <= half; i++) {
        const X = 7 + i;
        let col = i < 0 ? "#6fd0f0" : "#3aa6d8";
        if (y < 5) col = i < 0 ? "#bff0ff" : "#8fdcf5";
        if (Math.abs(i) === half) col = "#1e6f96";
        px(X, y + 1, col);
      }
    }
    px(5, 3, "#ffffff"); px(4, 4, "#ffffff"); px(6, 3, "#ffffff");
  });

  function themeTiles(name) {
    const th = THEME[name];
    const [gBase, gDark, gLight] = th.ground;
    const groundFill = [0, 1, 2, 3].map((v) => canvas16((x, px) => {
      x.fillStyle = gBase; x.fillRect(0, 0, 16, 16);
      if (name === "clinic") {
        // Linoleum: große Platten mit Fugen
        x.fillStyle = gDark; x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
        x.fillStyle = gLight; x.fillRect(2, 3 + v, 5, 1);
        return;
      }
      for (let i = 0; i < 10; i++) px((hash(v * 7 + i, 3) * 16) | 0, (hash(i, v * 5 + 1) * 16) | 0, i < 6 ? gDark : gLight);
      if (name === "mine" && v === 2) { px(5, 9, "#6fd0e8"); px(6, 9, "#bff0ff"); }
      if (name === "glacier" && v === 1) { px(9, 6, "#d6f3ff"); px(10, 6, "#ffffff"); }
      if (name === "vineyard" && v === 3) { px(4, 10, "#c9b8a0"); px(5, 10, "#c9b8a0"); px(5, 11, "#9a8a70"); }
    }));
    const groundTop = [0, 1, 2, 3].map((v) => canvas16((x, px) => {
      x.drawImage(groundFill[v], 0, 0);
      if (name === "meadow") {
        x.fillStyle = "#4fae58"; x.fillRect(0, 0, 16, 4);
        x.fillStyle = "#7fd37f"; x.fillRect(0, 0, 16, 1);
        for (let i = 0; i < 16; i++) if (hash(v * 16 + i, 9) > 0.55) px(i, 4, "#3d8f45");
        if (v === 1) { px(4, 0, "#f4f1e8"); px(3, 1, "#f4f1e8"); px(5, 1, "#f4f1e8"); px(4, 1, "#f0b43c"); }
      } else if (name === "mine") {
        x.fillStyle = "#5d6375"; x.fillRect(0, 0, 16, 2);
        x.fillStyle = "#7a8196"; x.fillRect(0, 0, 16, 1);
      } else if (name === "clinic") {
        // Flurboden: hell glänzende Oberkante, darunter eine blaue Sockelleiste
        x.fillStyle = "#b9c7d6"; x.fillRect(0, 0, 16, 3);
        x.fillStyle = "#e8eef5"; x.fillRect(0, 0, 16, 1);
        x.fillStyle = "#3d6fb0"; x.fillRect(0, 3, 16, 2);
        if (v === 2) { x.fillStyle = "#ffffff"; x.fillRect(5, 1, 4, 1); }
      } else if (name === "glacier") {
        // Schnee mit leicht welliger Kante
        x.fillStyle = "#f4fbff"; x.fillRect(0, 0, 16, 5);
        x.fillStyle = "#cfe6f3"; x.fillRect(0, 4, 16, 1);
        for (let i = 0; i < 16; i++) if (hash(v * 16 + i, 4) > 0.6) px(i, 5, "#e2f1f9");
        if (v === 3) { px(7, 1, "#bfe2f2"); px(8, 1, "#bfe2f2"); }
      } else if (name === "vineyard") {
        // Gras mit kleinen Weinblättern
        x.fillStyle = "#7aa63c"; x.fillRect(0, 0, 16, 4);
        x.fillStyle = "#a7cf5a"; x.fillRect(0, 0, 16, 1);
        for (let i = 0; i < 16; i++) if (hash(v * 16 + i, 7) > 0.6) px(i, 4, "#5e8a2c");
        if (v === 0) { px(11, 1, "#4f7a22"); px(12, 1, "#4f7a22"); px(11, 2, "#4f7a22"); }
        if (v === 2) { px(3, 1, "#7d3a8a"); px(4, 1, "#7d3a8a"); px(3, 2, "#5c2766"); }
      }
    }));
    const [rBase, rHi, rLo, rMark] = th.rock;
    const rock = canvas16((x, px) => {
      x.fillStyle = rBase; x.fillRect(0, 0, 16, 16);
      x.fillStyle = rHi; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
      x.fillStyle = rLo; x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
      if (name === "vineyard") {
        // Trockenmauer: unregelmäßige Steine
        x.fillStyle = rLo; x.fillRect(0, 5, 16, 1); x.fillRect(0, 10, 16, 1); x.fillRect(6, 0, 1, 5); x.fillRect(11, 5, 1, 5); x.fillRect(4, 10, 1, 6);
        x.fillStyle = rHi; x.fillRect(1, 6, 9, 1); x.fillRect(7, 1, 7, 1);
      } else if (name === "clinic") {
        // Wandpaneel mit Schrauben
        x.fillStyle = rMark; px(3, 3, rMark); px(12, 3, rMark); px(3, 12, rMark); px(12, 12, rMark);
      } else if (name === "glacier") {
        // Eisblock mit Glanzlicht
        x.fillStyle = "#ffffff"; x.fillRect(3, 3, 4, 1); x.fillRect(3, 4, 1, 3);
        for (let i = 0; i < 4; i++) px(9 + i, 9 + i, rMark);
      } else for (let i = 0; i < 5; i++) px(6 + (i >> 1), 4 + i, rMark);
    });
    const [bBase, bLine, bHi] = th.brick;
    const brick = canvas16((x) => {
      x.fillStyle = bBase; x.fillRect(0, 0, 16, 16);
      x.fillStyle = bLine;
      x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(7, 0, 1, 7); x.fillRect(0, 8, 1, 7); x.fillRect(15, 8, 1, 7);
      x.fillStyle = bHi;
      x.fillRect(0, 0, 7, 1); x.fillRect(8, 0, 8, 1); x.fillRect(1, 8, 14, 1);
      if (name === "clinic") { x.fillStyle = "#e5484d"; x.fillRect(3, 3, 1, 3); x.fillRect(2, 4, 3, 1); } // ein Kreuz auf den Kacheln
    });
    const block = [0, 1].map((f) => canvas16((x, px) => {
      x.fillStyle = "#12343f"; x.fillRect(0, 0, 16, 16);
      x.fillStyle = "#1f6f86"; x.fillRect(1, 1, 14, 14);
      x.fillStyle = "#0b1f26"; x.fillRect(1, 1, 1, 1); x.fillRect(14, 1, 1, 1); x.fillRect(1, 14, 1, 1); x.fillRect(14, 14, 1, 1);
      const gem = f ? ["#e9fbff", "#8fe3ff"] : ["#8fe3ff", "#4fb8dc"];
      for (let y = 0; y < 8; y++) {
        const half = y < 3 ? y + 1 : 7 - y;
        for (let i = -half; i <= half; i++) px(8 + i, 4 + y, i < 0 ? gem[0] : gem[1]);
      }
    }));
    const used = canvas16((x) => {
      x.fillStyle = "#3b2f25"; x.fillRect(0, 0, 16, 16);
      x.fillStyle = "#6d5a48"; x.fillRect(1, 1, 14, 14);
      x.fillStyle = "#3b2f25"; x.fillRect(3, 3, 1, 1); x.fillRect(12, 3, 1, 1); x.fillRect(3, 12, 1, 1); x.fillRect(12, 12, 1, 1);
    });
    return { groundFill, groundTop, rock, brick, block, used };
  }
  const TILES = {};
  for (const k in THEME) TILES[k] = themeTiles(k);

  // Hintergrundebenen wiederholen sich waagrecht und ziehen langsamer vorbei als das Level
  function layer(width, draw) {
    const c = canvas(width, VH);
    draw(c.getContext("2d"), width);
    return c;
  }
  function skyLayer(stops) {
    return layer(4, (x) => {
      const g = x.createLinearGradient(0, 0, 0, VH);
      for (const [at, col] of stops) g.addColorStop(at, col);
      x.fillStyle = g; x.fillRect(0, 0, 4, VH);
    });
  }
  const BG = {
    meadow: {
      sky: skyLayer([[0, "#7fb8e6"], [0.7, "#cfe8f7"], [1, "#e4f2f8"]]),
      layers: [
        [0.06, layer(1024, (x) => {
          x.fillStyle = "#f7fbff";
          [[60, 46, 34], [300, 64, 24], [520, 38, 40], [760, 58, 28], [930, 42, 20]].forEach(([cx, cy, w]) => {
            x.fillRect(cx, cy, w, 6); x.fillRect(cx + 4, cy - 4, w - 10, 4); x.fillRect(cx + 10, cy - 7, w - 22, 3);
          });
        })],
        [0.18, layer(1024, (x, w) => {
          for (let i = 0; i < w; i++) {
            const a = (i / w) * Math.PI * 2;
            const h = 74 + 28 * Math.sin(a * 3 + 0.5) + 14 * Math.sin(a * 7 + 1.3) + 6 * Math.sin(a * 17 + 2);
            const top = Math.round(VH - h - 50);
            x.fillStyle = "#93aac4"; x.fillRect(i, top, 1, VH - top);
            if (h > 88) { x.fillStyle = "#f2f6fa"; x.fillRect(i, top, 1, Math.round((h - 88) / 3) + 2); }
          }
        })],
        [0.45, layer(640, (x, w) => {
          const hill = (i) => Math.round(166 + 10 * Math.sin((i / w) * Math.PI * 4) + 6 * Math.sin((i / w) * Math.PI * 10 + 1));
          for (let i = 0; i < w; i++) { const top = hill(i); x.fillStyle = "#6f9d78"; x.fillRect(i, top, 1, VH - top); }
          for (let t = 0; t < 16; t++) {
            const cx = t * 40 + 12, base = hill(cx) + 2;
            x.fillStyle = "#4b7a5a";
            for (let k = 0; k < 18; k++) { const half = Math.floor((k % 6) * 0.9 + k / 5); x.fillRect(cx - half, base - 20 + k, half * 2 + 1, 1); }
            x.fillStyle = "#5a3f2a"; x.fillRect(cx, base - 2, 1, 3);
          }
        })],
      ],
    },
    mine: {
      sky: skyLayer([[0, "#10131b"], [1, "#262b38"]]),
      layers: [
        [0.3, layer(512, (x, w) => {
          for (let i = 0; i < w; i++) {
            const a = (i / w) * Math.PI * 2;
            const top = Math.round(36 + 18 * Math.abs(Math.sin(a * 6)) + 8 * Math.sin(a * 13));
            x.fillStyle = "#1d212c"; x.fillRect(i, 32, 1, top - 32);
            const bot = Math.round(150 + 16 * Math.sin(a * 5 + 1) + 6 * Math.sin(a * 11));
            x.fillRect(i, bot, 1, VH - bot);
          }
          for (let k = 0; k < 14; k++) {
            const gx = (hash(k, 77) * w) | 0, gy = 70 + ((hash(k, 31) * 70) | 0);
            x.fillStyle = "#3d7f96"; x.fillRect(gx, gy, 2, 2);
            x.fillStyle = "#9fe3f5"; x.fillRect(gx, gy, 1, 1);
          }
        })],
      ],
    },
    // Nachtschicht: ein Klinikflur bei Nacht, hinten große Fenster mit Mond und Sternen, Deckenlampen
    clinic: {
      sky: skyLayer([[0, "#0e1430"], [0.6, "#1b2448"], [1, "#2a3358"]]),
      layers: [
        [0.08, layer(1024, (x, w) => {
          // Nachthimmel mit Sternen hinter den Fenstern
          for (let k = 0; k < 90; k++) {
            const sx = (hash(k, 11) * w) | 0, sy = 8 + ((hash(k, 12) * 110) | 0);
            x.fillStyle = hash(k, 13) > 0.7 ? "#ffffff" : "#9fb3e6"; x.fillRect(sx, sy, 1, 1);
          }
          x.fillStyle = "#fff6d0";
          for (let y = -9; y <= 9; y++) { const hw = Math.round(Math.sqrt(81 - y * y)); x.fillRect(700 - hw, 40 + y, hw * 2, 1); }
          x.fillStyle = "#e9dfb5"; x.fillRect(696, 36, 3, 2); x.fillRect(703, 44, 2, 2);
        })],
        [0.3, layer(512, (x, w) => {
          // Wand mit Fensterreihe: die Fenster sind Löcher, durch die der Himmel scheint
          x.fillStyle = "#26304f"; x.fillRect(0, 0, w, 16);
          x.fillStyle = "#2c375c"; x.fillRect(0, 124, w, VH - 124);
          for (let i = 0; i < w; i += 128) {
            x.fillStyle = "#26304f"; x.fillRect(i, 16, 24, 108); x.fillRect(i + 104, 16, 24, 108);
            x.fillStyle = "#4a5784"; x.fillRect(i + 24, 16, 2, 108); x.fillRect(i + 102, 16, 2, 108); x.fillRect(i + 26, 68, 76, 2);
            x.fillStyle = "#56628f"; x.fillRect(i + 24, 122, 80, 3);
            // Deckenlampe mit Lichtkegel
            x.fillStyle = "#e9f2ff"; x.fillRect(i + 4, 16, 16, 3);
            x.fillStyle = "rgba(230,240,255,0.10)";
            for (let k = 0; k < 40; k++) x.fillRect(i + 4 - k / 3, 19 + k, 16 + (2 * k) / 3, 1);
          }
          // Handlauf an der Wand
          x.fillStyle = "#7f8db3"; x.fillRect(0, 150, w, 2);
          x.fillStyle = "#3d4a73"; x.fillRect(0, 152, w, 1);
        })],
        [0.55, layer(640, (x, w) => {
          // Türen zu den Zimmern und ein Infusionsständer
          for (let i = 30; i < w; i += 160) {
            x.fillStyle = "#3a4a78"; x.fillRect(i, 128, 34, 80);
            x.fillStyle = "#4d5f94"; x.fillRect(i + 2, 130, 30, 78);
            x.fillStyle = "#c9d6f2"; x.fillRect(i + 26, 168, 3, 2);
            x.fillStyle = "#9bb0e0"; x.fillRect(i + 8, 136, 18, 10);
            x.fillStyle = "#8fa0c8"; x.fillRect(i + 90, 150, 1, 58); x.fillRect(i + 85, 206, 11, 2);
            x.fillStyle = "#cfe8ff"; x.fillRect(i + 87, 146, 6, 8);
          }
        })],
      ],
    },
    // Gletscherpfad: kühler Himmel, verschneite Gipfel, Eisrücken
    glacier: {
      sky: skyLayer([[0, "#9fd0f0"], [0.65, "#dff1fb"], [1, "#f5fbff"]]),
      layers: [
        [0.05, layer(1024, (x) => {
          x.fillStyle = "#ffffff";
          [[120, 40, 30], [420, 58, 22], [680, 34, 36], [880, 52, 26]].forEach(([cx, cy, w]) => {
            x.fillRect(cx, cy, w, 5); x.fillRect(cx + 5, cy - 3, w - 12, 3);
          });
        })],
        [0.16, layer(1024, (x, w) => {
          for (let i = 0; i < w; i++) {
            const a = (i / w) * Math.PI * 2;
            const h = 96 + 34 * Math.abs(Math.sin(a * 4 + 0.3)) + 12 * Math.sin(a * 11 + 1);
            const top = Math.round(VH - h - 40);
            x.fillStyle = "#b9cfe2"; x.fillRect(i, top, 1, VH - top);
            x.fillStyle = "#ffffff"; x.fillRect(i, top, 1, Math.round(h / 4));
          }
        })],
        [0.42, layer(640, (x, w) => {
          for (let i = 0; i < w; i++) {
            const top = Math.round(170 + 9 * Math.sin((i / w) * Math.PI * 6) + 5 * Math.sin((i / w) * Math.PI * 14 + 2));
            x.fillStyle = "#cfe6f3"; x.fillRect(i, top, 1, VH - top);
            x.fillStyle = "#ffffff"; x.fillRect(i, top, 1, 2);
          }
          for (let t = 0; t < 10; t++) {
            const cx = t * 64 + 20;
            x.fillStyle = "#9cc7dd";
            for (let k = 0; k < 14; k++) x.fillRect(cx - (k >> 2), 160 + k, 1 + (k >> 1), 1);
          }
        })],
      ],
    },
    // Weinberg im Kochertal: warmer Nachmittagshimmel, Hügel mit Rebzeilen, Trockenmauern
    vineyard: {
      sky: skyLayer([[0, "#8ec5ea"], [0.6, "#f6e2b5"], [1, "#f7d79a"]]),
      layers: [
        [0.04, layer(1024, (x) => {
          x.fillStyle = "#fff4d6";
          for (let y = -10; y <= 10; y++) { const hw = Math.round(Math.sqrt(100 - y * y)); x.fillRect(820 - hw, 44 + y, hw * 2, 1); }
          x.fillStyle = "#fffaf0";
          [[150, 50, 30], [470, 36, 26]].forEach(([cx, cy, w]) => { x.fillRect(cx, cy, w, 5); x.fillRect(cx + 5, cy - 3, w - 12, 3); });
        })],
        [0.18, layer(1024, (x, w) => {
          for (let i = 0; i < w; i++) {
            const a = (i / w) * Math.PI * 2;
            const top = Math.round(118 + 18 * Math.sin(a * 2 + 0.4) + 8 * Math.sin(a * 5 + 1));
            x.fillStyle = "#9db86a"; x.fillRect(i, top, 1, VH - top);
            // Rebzeilen als schräge Streifen
            for (let y = top + 4; y < VH; y += 6) if (((i + y) >> 1) % 5 === 0) { x.fillStyle = "#7f9e4e"; x.fillRect(i, y, 1, 2); }
          }
          // eine kleine Kapelle auf dem Hügel
          x.fillStyle = "#f2ead8"; x.fillRect(300, 104, 14, 12); x.fillStyle = "#b5482f"; x.fillRect(298, 98, 18, 6); x.fillRect(305, 90, 4, 8);
        })],
        [0.45, layer(640, (x, w) => {
          for (let i = 0; i < w; i++) {
            const top = Math.round(176 + 6 * Math.sin((i / w) * Math.PI * 4));
            x.fillStyle = "#6f8f3e"; x.fillRect(i, top, 1, VH - top);
          }
          for (let t = 0; t < 20; t++) {
            const cx = t * 32 + 8;
            x.fillStyle = "#6b4a2a"; x.fillRect(cx, 156, 1, 22);
            x.fillStyle = "#4f7a22"; x.fillRect(cx - 4, 156, 9, 6); x.fillRect(cx - 3, 162, 7, 4);
            x.fillStyle = "#6a2c74"; x.fillRect(cx - 2, 163, 2, 3); x.fillRect(cx + 2, 160, 2, 3);
          }
        })],
      ],
    },
  };

  // ---------------------------------------------------------------- Zeichnen
  // ein Pixel je Kachel: die Streckenkarte
  function miniMap(s) {
    const th = THEME[s.theme] || THEME.meadow;
    const c = canvas(s.cols, ROWS);
    const x = c.getContext("2d");
    x.fillStyle = th.mini;
    x.fillRect(0, 0, s.cols, ROWS);
    for (let r = 0; r < ROWS; r++) for (let col = 0; col < s.cols; col++) {
      const t = s.grid[r][col];
      const color = t === "#" ? th.miniGround : t === "R" ? th.miniRock : t === "B" || t === "b" ? th.miniBrick : t === "Q" || t === "P" ? "#4fb8dc" : t === "o" ? "#f0b43c" : t === "~" ? "#3f86c4" : null;
      if (color) { x.fillStyle = color; x.fillRect(col, r, 1, 1); }
    }
    x.fillStyle = "#d9a55a";
    for (const L of s.lifts) x.fillRect(L.x / T, Math.round(L.y / T), L.w / T, 1);
    x.fillStyle = "#c14a63"; x.fillRect(s.flagCol, 2, 1, s.flagBaseRow - 2);
    return c;
  }

  // ein Bild je 8 px Weg, so deckt ein Schritt bei jedem Tempo etwa eine Kachel ab
  const RUN_CYCLE = ["run1", "run2", "run3", "run4"];
  function heroFrame(p) {
    if (!p.onGround) return p.vy < 0 ? "jump" : "fall";
    if (p.skid) return "skid";
    if (Math.abs(p.vx) < 0.1) return "stand";
    return RUN_CYCLE[Math.floor(p.anim / 8) % 4];
  }
  const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
  function drawNumber(g, n, x, y, color) {
    g.fillStyle = color;
    String(n).split("").forEach((ch, k) => {
      const bits = DIGITS[+ch];
      for (let i = 0; i < 15; i++) if (bits[i] === "1") g.fillRect(x + k * 4 + (i % 3), y + Math.floor(i / 3), 1, 1);
    });
  }
  // Pixelschrift für Initialen über den Figuren: 5 Zeilen hoch, meist 4 Pixel breit (M und W 5)
  const GLYPH = {
    A: ".##.#..######..##..#", B: "###.#..####.#..####.", C: ".####...#...#....###", D: "###.#..##..##..####.", E: "#####...###.#...####",
    F: "#####...###.#...#...", G: ".####...#.###..#.###", H: "#..##..######..##..#", I: "###..#...#...#..###.", J: "..##...#...##..#.##.",
    K: "#..##.#.##..#.#.#..#", L: "#...#...#...#...####", M: "#...###.###.#.##...##...#", N: "#..###.##.###..##..#", O: ".##.#..##..##..#.##.",
    P: "###.#..####.#...#...", Q: ".##.#..##..##.#..#.#", R: "###.#..####.#.#.#..#", S: ".####....##....####.", T: "###..#...#...#...#..",
    U: "#..##..##..##..#.##.", V: "#..##..##..#.##..##.", W: "#...##...##.#.###.###...#", X: "#..#.##..##..##.#..#", Y: "#.#.#.#..#...#...#..",
    Z: "####...#.##.#...####", 0: ".##.#..##..##..#.##.", 1: ".#..##...#...#..###.", 2: "###....#.##.#...####", 3: "###....#.##....####.",
    4: "#..##..#####...#...#", 5: "#####...###....####.", 6: ".##.#...###.#..#.##.", 7: "####...#..#..#...#..", 8: ".##.#..#.##.#..#.##.", 9: ".##.#..#.###...#.##.",
  };
  const glyphW = (ch) => (GLYPH[ch] ? GLYPH[ch].length / 5 : 3);
  function textWidth(text) {
    let w = 0;
    for (const ch of text) w += glyphW(ch) + 1;
    return Math.max(0, w - 1);
  }
  function drawText(g, text, x, y, color) {
    g.fillStyle = color;
    for (const ch of text) {
      const gl = GLYPH[ch], gw = glyphW(ch);
      if (gl) for (let i = 0; i < gl.length; i++) if (gl[i] === "#") g.fillRect(x + (i % gw), y + Math.floor(i / gw), 1, 1);
      x += gw + 1;
    }
  }
  // Initialen aus „Lena K.“ → „LK“, Umlaute ohne Punkte; mehrfach vorkommende Namen tragen eine Zahl („Lena K. 2“)
  function initials(name) {
    const plain = String(name || "").toUpperCase().replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/Ü/g, "U").replace(/ß/g, "S");
    const parts = plain.split(/\s+/).filter(Boolean);
    let out = parts.filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join("").slice(0, 3);
    const num = parts.find((w) => /^\d+$/.test(w));
    if (num) out = out.slice(0, 2) + num.slice(0, 1);
    return out || "?";
  }
  // Namensschild über der Figur: dunkles Kästchen, Initialen in der Spielerfarbe; top ist seine Oberkante
  function tagBox(text, cx, top) {
    const tw = textWidth(text);
    return { x: Math.round(cx - tw / 2) - 2, y: Math.round(top) - 9, w: tw + 4, h: 8 };
  }
  function drawTag(g, text, cx, top, color) {
    const tw = textWidth(text), x = Math.round(cx - tw / 2) - 2, y = Math.round(top) - 9;
    g.fillStyle = "rgba(13,14,18,0.78)"; g.fillRect(x, y, tw + 4, 8);
    g.fillStyle = color; g.fillRect(x, y + 7, tw + 4, 1);
    drawText(g, text, x + 2, y + 1, color);
  }

  // eine Kachel in Kontext g; above ist die Kachel eine Zeile höher (Gras und Wasseroberfläche brauchen sie)
  function paintTile(g, th, tiles, t, above, c, r, X, Y, tick) {
    if (t === "#") g.drawImage((SOLID.has(above) ? tiles.groundFill : tiles.groundTop)[(hash(c, r) * 4) | 0], X, Y);
    else if (t === "R") g.drawImage(tiles.rock, X, Y);
    else if (t === "B" || t === "b") g.drawImage(tiles.brick, X, Y);
    else if (t === "Q" || t === "P") g.drawImage(tiles.block[(tick >> 4) % 3 === 0 ? 1 : 0], X, Y);
    else if (t === "U") g.drawImage(tiles.used, X, Y);
    else if (t === "o") drawCoin(g, X + 8, Y + 8, tick);
    else if (t === "~") drawWater(g, th, c, X, Y, above !== "~", tick);
  }
  function drawCoin(g, cx, cy, tick) {
    const w = Math.max(1, Math.round(Math.abs(Math.cos(tick / 9)) * 4));
    g.fillStyle = "#b87a12"; g.fillRect(cx - w - 1, cy - 6, w * 2 + 2, 12);
    g.fillStyle = "#f0b43c"; g.fillRect(cx - w, cy - 5, w * 2, 10);
    g.fillStyle = "#ffe9a8"; g.fillRect(cx - w, cy - 5, 1, 6);
  }
  function drawWater(g, th, c, X, Y, surface, tick) {
    const top = surface ? 6 : 0;
    g.fillStyle = th.water[0]; g.fillRect(X, Y + top, T, T - top);
    if (!surface) return;
    g.fillStyle = th.water[1];
    const off = (tick >> 3) % 6;
    for (let i = 0; i < T; i++) if ((((c * T + i - off) % 6) + 6) % 6 < 3) g.fillRect(X + i, Y + 6, 1, 1);
  }
  // Die Hütte am Levelende, schlicht: Wand, Satteldach über die ganze Breite, Tür und zwei Fenster.
  // X ist ihre linke Wand, Y der Boden; die Tür in der Mitte (X + 32 bis X + 48) ist der Eingang.
  function drawHut(g, X, Y, theme) {
    const P = (THEME[theme] || THEME.meadow).hut;
    const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    px(X, Y - 40, 80, 40, P.edge);
    px(X + 1, Y - 39, 78, 39, P.wall);
    const apexY = Y - 72, eaveY = Y - 38;
    for (let y = apexY; y < eaveY; y++) {
      const hw = Math.round(((y - apexY + 1) * 48) / (eaveY - apexY));
      px(X + 40 - hw, y, hw * 2, 1, P.edge);
      if (hw > 1 && y < eaveY - 2) px(X + 41 - hw, y, hw * 2 - 2, 1, P.roof);
    }
    for (const wx of [X + 12, X + 56]) {
      px(wx, Y - 30, 12, 12, P.edge);
      px(wx + 1, Y - 29, 10, 10, P.glass);
    }
    px(X + 32, Y - 28, 16, 28, P.edge);
    px(X + 33, Y - 27, 14, 27, P.door);
    px(X + 43, Y - 15, 2, 2, P.glass);
    if (theme === "clinic") { px(X + 37, Y - 58, 6, 14, "#e5484d"); px(X + 33, Y - 54, 14, 6, "#e5484d"); } // das Stationszimmer
  }
  function drawLift(g, X, Y, W) {
    g.fillStyle = "#3b2414"; g.fillRect(X, Y, W, E.LIFT_H);
    g.fillStyle = "#d9a55a"; g.fillRect(X, Y, W, E.LIFT_H - 2);
    g.fillStyle = "#f3d28f"; g.fillRect(X, Y, W, 1);
    g.fillStyle = "#8a5a2b";
    for (let i = 4; i < W - 2; i += 8) g.fillRect(X + i, Y + 3, 2, 2);
  }
  function drawPole(g, fx, flagY, base, won, tick) {
    g.fillStyle = "#d9dce3"; g.fillRect(fx, 2 * T, 2, base - 2 * T);
    g.fillStyle = "#8f929c"; g.fillRect(fx + 1, 2 * T, 1, base - 2 * T);
    g.fillStyle = "#f0b43c"; g.fillRect(fx - 1, 2 * T - 3, 4, 3);
    for (let k = 0; k < 11; k++) {
      const len = Math.round(14 * (1 - Math.abs(k - 5) / 6) + Math.sin((tick + k * 4) / 8));
      g.fillStyle = won ? "#f0b43c" : "#c14a63";
      g.fillRect(fx - len, flagY + k, len, 1);
    }
    g.fillStyle = "#ffffff";
    g.fillRect(fx - 7, flagY + 4, 1, 1); g.fillRect(fx - 8, flagY + 5, 3, 1); g.fillRect(fx - 9, flagY + 6, 5, 1);
  }
  function drawRepeat(g, img, offset, vw) {
    const w = img.width, o = ((offset % w) + w) % w;
    for (let x = -o; x < vw; x += w) g.drawImage(img, x, 0);
  }

  // Bild einer Figur; color 0–3
  function figureImage(p, color) {
    const N = NURSES[color] || NURSES[0];
    let big = p.big;
    if (p.freezeKind === "grow" || p.freezeKind === "shrink") big = (p.freeze >> 2) % 2 === (p.freezeKind === "grow" ? 0 : 1);
    if (p.status === "dead" || p.freezeKind === "die") return { img: N.dead, big: false };
    return { img: (big ? N.big : N.small)[heroFrame(p)][p.facing], big };
  }
  // die Figur mittig über der Trefferfläche, die Füße (Zeile NURSE_GROUND) auf ihrer Unterkante
  function drawFigure(g, p, cam, color, alpha, tick) {
    if (p.status === "done") return;
    if (p.hurt > 0 && (tick >> 1) % 2) return;
    const f = figureImage(p, color);
    if (alpha < 1) g.globalAlpha = alpha;
    g.drawImage(f.img, Math.round(p.x + p.w / 2 - f.img.width / 2 - cam), Math.round(p.y + p.h - NURSE_GROUND[f.big ? "big" : "small"]));
    g.globalAlpha = 1;
  }
  function figureTop(p) {
    const f = figureImage(p, 0);
    return p.y + p.h - NURSE_GROUND[f.big ? "big" : "small"] + (f.big ? 3 : 2);
  }

  function makeView(cv) {
    const g = cv.getContext("2d", { alpha: false });
    g.imageSmoothingEnabled = false;
    return { cv, g, particles: [], tick: 0 };
  }
  function burst(view, x, y, n, colors, spread, up, size) {
    for (let i = 0; i < n; i++) {
      view.particles.push({
        x, y, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * up,
        life: 24 + ((Math.random() * 30) | 0), size: size || (Math.random() < 0.3 ? 2 : 1),
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }
  function stepParticles(view) {
    for (const q of view.particles) { q.x += q.vx; q.y += q.vy; q.vy += 0.15; q.life--; }
    view.particles = view.particles.filter((q) => q.life > 0 && q.y < VH + 4);
  }
  // Partikel zu einem Ereignis der Engine
  function eventFx(view, w, e) {
    const th = THEME[w.s.theme] || THEME.meadow;
    switch (e.t) {
      case "land": burst(view, e.x, e.y, 4, ["#e4dccb", "#c9bfa9"], 1.4, 0.7); break;
      case "stomp": burst(view, e.x + 7, e.y, 6, ["#f0b43c", "#ffffff"], 2.4, 1.6); break;
      case "coin": if (e.pop) burst(view, e.x + 8, e.y - 6, 6, ["#f0b43c", "#ffe9a8"], 1, 3.5, 2); break;
      case "bonus": burst(view, e.x + 7, e.y, 10, ["#8fe3ff", "#ffffff"], 2, 2.5); break;
      case "break": burst(view, e.x + 8, e.y + 8, 10, th.crumbs, 3, 4, 3); break;
    }
  }

  // Ein Level zeichnen.
  //   w: Welt; opts.cam: linker Bildrand in Levelpixeln; opts.figures: [{ p, color, alpha, tag }] (in Zeichenreihenfolge);
  //   opts.coins: Münzzahl oben links (oder null); opts.won: Fahne in Gold
  function drawWorld(view, w, opts) {
    const g = view.g, vw = view.cv.width, s = w.s, cam = Math.round(opts.cam), th = THEME[s.theme] || THEME.meadow;
    const tiles = TILES[s.theme] || TILES.meadow, bg = BG[s.theme] || BG.meadow, tick = view.tick;
    g.drawImage(bg.sky, 0, 0, vw, VH);
    for (const [k, img] of bg.layers) drawRepeat(g, img, Math.round(cam * k + (k < 0.1 ? tick * 0.05 : 0)), vw);
    const hx = s.hutCol * T - cam;
    if (hx > -100 && hx < vw + 20) drawHut(g, hx, s.hutFloor * T, s.theme);
    for (const it of w.items) if (!it.gone && it.rise > 0) g.drawImage(CRYSTAL, Math.round(it.x - 1 - cam), Math.round(it.y - 1));
    const c0 = Math.floor(cam / T), c1 = c0 + Math.ceil(vw / T);
    for (let r = 0; r < ROWS; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = E.tileAt(w, c, r);
        if (t === "." || c < 0) continue;
        const bump = w.bumps.find((b) => b.c === c && b.r === r);
        const dy = bump ? -Math.round(Math.sin(((8 - bump.t) / 8) * Math.PI) * 5) : 0;
        paintTile(g, th, tiles, t, E.tileAt(w, c, r - 1), c, r, c * T - cam, r * T + dy, tick);
      }
    }
    // nachwachsende Ziegel schimmern kurz vorher durch
    for (const b of w.regrow) if (b.t < 60 && (tick >> 2) % 2) { g.globalAlpha = 0.35; g.drawImage(tiles.brick, b.c * T - cam, b.r * T); g.globalAlpha = 1; }
    const fx = s.flagCol * T + 7 - cam, base = s.flagBaseRow * T;
    if (fx > -24 && fx < vw + 4) drawPole(g, fx, w.flagY, base, opts.won || w.flagDown, tick);
    for (const L of w.lifts) if (L.x + L.w > cam && L.x < cam + vw) drawLift(g, Math.round(L.x - cam), Math.round(L.y), L.w);
    for (const it of w.items) if (!it.gone && it.rise <= 0) g.drawImage(CRYSTAL, Math.round(it.x - 1 - cam), Math.round(it.y - 1));
    const BUG = BUGS[s.theme] || BUGS.meadow, SNL = SNAILS[s.theme] || SNAILS.meadow;
    for (const e of w.enemies) {
      // noch nicht losgelaufene Gegner warten an ihrem Platz (im Breitbild am Beamer sind sie schon zu sehen)
      if (e.state === "gone" || e.x > cam + vw + 16 || e.x + e.w < cam - 16) continue;
      const dir = e.vx < 0 ? -1 : 1;
      let img;
      if (e.kind === "walker") img = e.state === "dead" ? BUG.dead : e.state === "flat" ? BUG.flat[dir] : (Math.floor(e.anim / 10) % 2 ? BUG.a[dir] : BUG.b[dir]);
      else if (e.state === "dead") img = SNL.dead;
      else if (e.state === "walk") img = Math.floor(e.anim / 12) % 2 ? SNL.a[dir] : SNL.b[dir];
      else img = SNL.shell[-1];
      const wobble = e.state === "shell" && e.timer < 60 && (tick >> 2) % 2 ? 1 : 0;
      g.drawImage(img, Math.round(e.x - 1 - cam) + wobble, Math.round(e.y + e.h - (e.kind === "walker" ? 15 : 14)));
    }
    for (const f of opts.figures || []) drawFigure(g, f.p, cam, f.color || 0, f.alpha == null ? 1 : f.alpha, tick);
    // Schilder, die sich überdecken würden, rutschen nach oben
    const placed = [];
    for (const f of opts.figures || []) {
      if (!f.tag || f.p.status === "done") continue;
      const cx = f.p.x + f.p.w / 2 - cam;
      let top = figureTop(f.p);
      for (let guard = 0; guard < 4; guard++) {
        const b = tagBox(f.tag, cx, top);
        const hit = placed.find((q) => b.x < q.x + q.w + 1 && b.x + b.w + 1 > q.x && b.y < q.y + q.h + 1 && b.y + b.h + 1 > q.y);
        if (!hit) break;
        top = hit.y;
      }
      placed.push(tagBox(f.tag, cx, top));
      drawTag(g, f.tag, cx, top, COLORS[f.color || 0].ui);
    }
    for (const q of view.particles) {
      g.fillStyle = q.color;
      g.fillRect(Math.round(q.x - cam), Math.round(q.y), q.size, q.size);
    }
    if (opts.coins != null) {
      g.fillStyle = "rgba(13,14,18,0.35)"; g.fillRect(8, 8, 30, 11);
      g.fillStyle = "#f0b43c"; g.fillRect(12, 10, 4, 7);
      g.fillStyle = "#ffe9a8"; g.fillRect(12, 10, 1, 4);
      drawNumber(g, String(opts.coins).padStart(2, "0"), 20, 11, "#ffffff");
    }
  }

  // Etappenkarte zwischen zwei Leveln
  function drawCard(view, title, name, big, color) {
    const g = view.g, vw = view.cv.width;
    g.fillStyle = "#0d0e12"; g.fillRect(0, 0, vw, VH);
    g.fillStyle = "#e7e9ee";
    g.font = "bold 16px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText(title, vw / 2, 104);
    g.font = "11px system-ui, sans-serif";
    g.fillStyle = "#9ba2b1";
    g.fillText(name, vw / 2, 122);
    const N = NURSES[color || 0], card = (big ? N.big : N.small).stand[1];
    g.drawImage(card, vw / 2 - card.width / 2, 162 - NURSE_GROUND[big ? "big" : "small"]);
    g.textAlign = "start";
  }

  // kleines Bild der stehenden Figur, z. B. für Listen und die Siegerehrung
  function portrait(color, big) {
    const N = NURSES[color || 0];
    return (big ? N.big : N.small).stand[1];
  }

  window.JRG = {
    COLORS, THEME, BG, NURSE_GROUND, makeView, drawWorld, drawCard, drawFigure, drawTag, drawText, textWidth, initials,
    miniMap, burst, stepParticles, eventFx, portrait, figureTop, heroFrame, TILES, BUGS, SNAILS, CRYSTAL, drawHut, drawLift, drawPole,
    paintTile: (g, theme, t, above, c, r, X, Y, tick) => paintTile(g, THEME[theme] || THEME.meadow, TILES[theme] || TILES.meadow, t, above, c, r, X, Y, tick),
  };
})();
