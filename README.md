# knitout-image-processing

Shaping and colorwork programs to output knitout files based on input images.\
For use in conjunction with a machine-specific knitout backend.

<table>
<tr><td><a href="#installation">Installation</a></td><td><a href="dependencies">Dependencies</a></td><td><a href="#usage">Usage</a></td><td><a href="#prompts">Command-line Prompts</a></td><td><a href="#troubleshooting">Troubleshooting</a></td><td><a href="#resources">Additional Resources</a></td></tr>
</table>

## <a id="installation"></a>Installation

In the command line, type:
```console
git clone https://github.com/gabrielle-ohlson/knitout-image-processing
```
See the github documentation on [cloning a repository](https://docs.github.com/en/free-pro-team@latest/github/creating-cloning-and-archiving-repositories/cloning-a-repository) if you need assistance with installation.

## <a id="dependencies"></a>Dependencies

The following dependencies will automatically be installed by running the command `npm install` after the repo has been cloned.
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en/download/)

**Packages to install with npm (package manager included with node.js):**
- [readline-sync](https://www.npmjs.com/package/readline-sync)
- [chalk](https://www.npmjs.com/package/chalk)
- [jimp](https://www.npmjs.com/package/jimp)
- [rgbquant](https://www.npmjs.com/package/rgbquant)

To install these dependencies, first open your terminal and change into the directory in which you installed the repo (e.g. if you installed it in <tt>home/user/code</tt> and kept the default repo name, you'd type: `cd home/user/code/knitout-image-processing`):
```console
cd <whatever-folder-you-installed-the-repo-in/the-repo-name>
```
```console
npm install
```
The dependenices will appear in a newly created folder called <tt>node_modules</tt>.

 **NOTE:** ensure that all dependencies have been installed before running the program.

## <a id="usage"></a>Usage

Place the image file (<tt>.png</tt> or <tt>.jpg</tt>) that you would like to process in the [in-colorwork-images](in-colorwork-images) folder.\
From your terminal, cd to the parent directory <tt>knitout-image-processing</tt> (if you have not already done so) and run the command:
[`npm run knitify`](#knitify) 

Respond to the [prompts](#prompts) as they appear in the terminal.\
When the program has finished running, a knitout file will be written to the sub-directory [knit-out-files](knit-out-files). A visual depiction of the knitting machine instructions will also be written to the parent directory (under the name <tt>knit_motif.png</tt>).

**To then add shaping to the file:**\
Place an image (.png or .jpg) in the [in-shape-images](in-shape-images) folder (*note: the graphic should include a white background and a shape with a completely black fill*.)\
From your terminal, run the command:
[`npm run shapeify`](#shapeify)

and respond to the prompts.\
The program will then output a knitout file to the sub-directory [knit-out-files](knit-out-files).

## <a id="prompts"></a>Command-line Prompts

<mark><a id="knitify"></a><ins>**Knitify**</ins></mark>
<table>
<tr>
<td>Prompt answers:</td>
<td><a href="#knitify1">1) Pre-load answers</a></td><td><a href="#knitify2">2) Save answers</a></td><td><a href="#knitify2a">2.a) Save answers as</a></td>
</tr>
<tr>
<td>Motif specs:</td>
<td><a href="#knitify3">3) Colorwork image file</a></td><td><a href="#knitify4">4) Piece width (stitches)</a></td><td><a href="#knitify5">5) Piece height (rows)</a></td><td><a href="#knitify6">6) Machine</a></td>
</tr>
<tr>
<td>Image processing:</td>
<td><a href="#knitify7">7) Color count</a></td><td><a href="#knitify8">8) Dithering</a></td><td><a href="#knitify9">9) Palette</a></td>
</tr>
<tr>
<td>Knitout extensions:</td>
<td><a href="#knitify10">10) Stitch number</a></td><td><a href="#knitify11">11) Speed number</a></td><td><a href="#knitify12">12) Waste section settings</a></td>
</tr>
<tr>
<td>Knitting techniques:</td>
<td><a href="#knitify13">13) Back style</a></td>
</tr>
<tr>
<td>Stitch patterns:</td>
<td><a href="#knitify14">14) Stitch patterns</a></td>
<td><a href="#knitify14a">14.a) Image file</a></td><td><a href="#knitify14b">14.b) Pattern name</a></td><td><a href="#knitify14c">14.c) Specifications</a></td><td><a href="#knitify14d">14.d) Include more?</a></td><td><a href="#knitify14e">14.e) Mapped color</a></td><td><a href="#knitify14f">14.f) Carrier</a></td><td><a href="#knitify14g">14.g) Customizations</a></td>
</tr>
<tr>
<td>Carrier assignments:</td>
<td><a href="#knitify15">15) Cast-on carrier</a></td><td><a href="#knitify16">16) Waste section carrier</a></td>
</tr>
<tr>
<td>Ribbing:</td>
<td><a href="#knitify17">17) Rib</a></td><td><a href="#knitify17a">17.a) Top rib</a></td><td><a href="#knitify17ai">17.a.i) Carrier</a></td><td><a href="#knitify17aii">17.a.ii) Row count</a></td><td><a href="#knitify17b">17.b) Bottom rib</a></td>
</tr>
<tr>
<td>Save:</td>
<td><a href="#knitify18">18) Save as</a></td>
</tr>
</table>

<a id="knitify1"></a>**1.** Option to pre-load prompt answers, saved from a prior session.  Enter the name of the <tt>.json</tt> file containing the prompt answers file (which should exist in the [prompt-answers](prompt-answers) folder, or hit the Enter key to skip this prompt.
```console
(press Enter to skip and answer prompts) Filename for pre-loaded prompt answers:
```
*e.g. `stars.json`*
___
<a id="knitify2"></a>**2.** Option to save the prompt answers for the current session for future re-use, saved from a prior session.  Key-in either `y` (yes) or `n` (no).
```console
Would you like to save the prompt answers you provide in this session? [y/n]:
```
*e.g. `y`*

  *if `y` (yes)*:
  - <a id="knitify12a"></a>**2.a)** Enter a name for the output <tt>.json</tt> file to write your prompt answer to. The file with be saved to the [prompt-answers](prompt-answers) folder.
```console
  Save prompt answers as:
```
  *e.g. `stars.json`*
___
<a id="knitify3"></a>**3.** Enter the name of the image to base the colorwork on (including the extension-- .png or .jpg). The image should exist in the [in-colorwork-images](in-colorwork-images) folder.\
If you are planning to create a piece that *only* includes a stitch pattern (i.e. no colorwork/motif), hit the Enter key to skip this prompt.
```console
(press Enter to skip if using only stitch pattern) Colorwork image file:
```
*e.g. `stars.png`*
___
<a id="knitify4"></a>**4.** The image's width (in pixels) will be scaled to the number of stitches you'd like the piece to be (not to exceed the maximum needle count of the machine [e.g. for kniterate, 252, and for swgn2, 540]). Enter a number.
```console
(press Enter to scale stitches according to img dimensions)

How many stitches wide?
```
*e.g. `252`*
___
<a id="knitify5"></a>**5.** The same will occur for the image's height (in pixels), in accordance with the row count you specify.\
Note that the knitted piece will likely produce a squashed or stretched version of the image, depending on stitch size and yarn thickness. Thus, there is an additional option to input a floating point number to scale the image accordingly.\
Also note that if you are using only a stitch pattern and skipped the `Colorwork image file` prompt, answering this prompt is *required*.
```console
(Either input an exact row count, press Enter to scale rows according to needle count for true img dimensions, or input a float number for a specific scale.)

How many rows long?
```
*e.g. `300`*
___
<a id="knitify6"></a>**6.** Enter the make/model of the machine you will be using.
```console
What model knitting machine will you be using?
```
*e.g. `kniterate`* or `swgn2`
___
<a id="knitify7"></a>**7.** The program will reduce the number of colors in the image in accordance with the number you input.\
Keep in mind the maximum number of carriers your machine has (e.g. for kniterate, 6).
```console
How many colors would you like to use?
```
*e.g. `5`*
___
<a id="knitify8"></a>**8.** This determines how the program processes the image--dithering will create the illusion of a more colorful/detailed motif (with adjacent pixels in different colors optically blended to immitate another color). Opting out of this option will produce colors with hard edges. Key-in either `y` (yes) or `n` (no).
```console
Would you like to use dithering? (dithering is recommended for detailed/naturalistic images, but not for graphics/digital artwork.) [y/n]:
```
*e.g. `y`*
___
<a id="knitify9"></a>**9.** This option is useful for when there are certain colors you would like to prioritize in the image, such as when a color is low in occurrence but high in importance.\
If you opt to use a predefined palette, you will be met with the prompt `Enter hex-code for color #<n>:` for the `n`-number of colors you indicated that you will be using. Enter the hex-code e.g. `#FF0000`.
```console
Would you like to use a predefined palette? [y/n]:
```
*e.g. `n`*
___
<a id="knitify10"></a>**10.** Enter a number to set the stitch size (knitout extension: `x-stitch-number`) in the main body of the piece. For example, on kniterate machines, there are 16 valid values, with single digit values represented by a number (0 - 9) and double-digit values represented by a letter (A - F, with A being 10 and F being 15). Lower number produce smaller/tighter stitches.
```console
(OPTIONAL: press enter to skip this step) What would you like to set the stitch number as?
```
*e.g. `6`*
___
<a id="knitify11"></a>**11.** Enter a number to set the knitting speed for the piece (knitout extension: `x-speed-number`). Faster speeds are more efficient, but may increase the chances of dropped stitches/broken yarn on less sophisticated machines.
```console
(OPTIONAL: press enter to skip this step) What would you like to set the carriage speed number as? (valid speeds are between <0-600>)
```
*e.g. `300`*
___
<a id="knitify12"></a>**12.** Optionally, you can alter the default knitout-extension settings for the waste section at the beginning of the piece, or just stick with the defaults.
```console
Would you like to change any of the default settings for the waste section? (DEFAULT stitch number: 6, speed number: 400, roller advance: 150, rows: 40) [y/n]:
```
*e.g. `y`*
___
<a id="knitify13"></a>**13.** Key-in select the style that you'd like the program to produce for the back of the knit.\
Note that this prompt will not appear if you are using solely a stitch pattern.
```console
[1] Default
[2] Birdseye
[3] Minimal
[4] Secure
[0] CANCEL
  ^What style back would you like to use? (note: this doesn't matter if you're using *only* stitch patterns)
  => 'Default' is a freeform option that is similar to Birdseye in performance, but more suitable for pieces containing up to 5 colors.
  => 'Birdseye' is not recommended for pieces that use more than 3 colors due to the build up of extra rows the method creates on the back bed.
  => Alternatively, 'Minimal' creates a reasonably even ratio of front to back rows, resulting in the least amount of build up on the back.
  => 'Secure' is the 'Minimal' option, with additional knits on the side needles for extra security. [1...4 / 0]:
```
*e.g. `1`*
___
<a id="knitify14"></a>**14.** Indicate whether or not you'd like to include stitch patterns in the piece (either having the whole piece comprised of stitch patterns, or including sections of stitch patterns within the motif). If yes, you will specify the path to an image that has blobs of color that will be mapped to a specific stitch pattern (overlayed on the rest of the motif).\
Note that the image should only include a white background and the colors denoting stitch patterns.
```console
Would you like to include any stitch patterns in your motif? [y/n]:
```
*e.g. `y`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  *if `y` (yes)*:
  - <a id="knitify14a"></a>**14.a)** Enter the name of the stitch pattern graphic file (which should reside in the [in-stitch-patterns](in-stitch-patterns) sub-directory).
```console
  (press Enter to skip if using only *one* stitch pattern that *comprises the whole piece*) Stitch pattern image file:
```
  *e.g. `stitch-pattern.png`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="knitify14b"></a>**14.b)** Key-in select the stitch pattern that you'd like to use in the piece (repeat for however many stitch patterns you'd like to include).
```console
  [1] Rib
  [2] Bubbles
  [3] Seed
  [4] Lace
  [0] CANCEL

  ^Select a stitch pattern to use in your motif. [1...4 / 0]:
```
  *e.g. `1`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="knitify14c"></a>**14.c)** A number of prompts *might* follow to give you a chance to indicate specifications for the particular stitch pattern you chose.\
  (e.g. `Which type of rib?`)
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="knitify14d"></a>**14.d)** Option to include another stitch pattern (`y`) or to just use the one `n`.\
  Note that this prompt (and the rest of the subsequent stitch-pattern-related prompts) will not appear if you are using just one stitch pattern and skipped the `Stitch pattern image file` prompt.
```console
  Would you like to include another stitch pattern? [y/n]:
```
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="knitify14e"></a>**14.e)** Input the color that the stitch pattern is represented by in the stitch pattern graphic you're using.
```console
  Enter the hex-code (or color name) for the color you used to denote the '<your-stitch-pattern>' stitch pattern (e.g. #0000FF or blue):
```
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="knitify14f"></a>**14.f)** You will be prompted to assign a particular carrier to the given stitch pattern (it can either be one you already used in the piece [all of those will be listed with carrier number and the hex-code you assigned it] or a new carrier, if enough are leftover).
```console
  You may choose from the following list of existing carriers (along with the hex-code for the corresponding color), or specify a new carrier (if enough are left over).
  Carriers used in the motif thus far:
  Carrier 1: #ffffff

  Enter the carrier you'd like to use for the '<your-stitch-pattern>' stitch pattern (e.g. 1):
```
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="knitify14g"></a>**14.g)** Option to add use non-default customizations for the given stitch pattern. If yes (`y`), you'll be met with a number of additional prompts specific to the given stitch pattern.
```console
  Would you like to add any other customizations for the '<your-stitch-pattern>' stitch pattern? [y/n]:
```
___
<a id="knitify15"></a>**15.** Option to indicate a specific carrier you'd like to use for the cast-on. If unspecified (skipped with Enter key), the default carrier will be used for the cast-on, which is whatever color is detected by the program as the background.
```console
(OPTIONAL: press Enter to skip this step and use the default carrier [background color]) Which carrier would you like to use for the cast-on?
```
*e.g. `2`*
___
<a id="knitify16"></a>**16.** Option to indicate a specific carrier you'd like to use for the waste section. If unspecified (skipped with Enter key), the default carrier will be used to knit the waste section, which is carrier '1'.
```console
(OPTIONAL: press Enter to skip this step and use the default carrier [1]) Which carrier would you like to use for the waste section?
```
*e.g. `3`*
___
<a id="knitify17"></a>**17.** Option to add 1x1 ribbing to the top and/or the bottom of the piece.
```console
Would you like to add rib? [y/n]:
```
*e.g. `y`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  *if `y` (yes)*:
  - <a id="knitify17a"></a>**17.a)** Key-in `y` or `n`.
```console
  Would you like to add ribbing to the bottom of the piece? [y/n]:
```
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  *if `y` (yes)*:
  - <a id="knitify17ai"></a>**17.a.i)** Input the carrier to assign to the bottom rib. The hex-code for the carriers used thus far in the piece will be listed as options, and any leftover carriers will also listed in case you want to use a new carrier for the rib.
```console
    [1] #hexcode1
    [2] #hexcode2
    [3] #hexcode3 (...continued for # of colors)
    [4] new carrier
    [5] new carrier
    [6] new carrier
    [0] CANCEL
    ^Which carrier would you like to use for the bottom rib? (the corresponding hex code is listed next to each carrier number) [1...6 / 0]:
```
  *e.g. `2`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="knitify17aii"></a>**17.a.ii)** Input the number of row you'd like to knit for the rib length.
```console
    How many rows?
```
  *e.g. `30`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="knitify17b"></a>**17.b)** Key-in `y` or `n`.\
  *if `y` (yes)*, prompts listed about for bottom rib will repeat, this time for top rib.
```console
  Would you like to add ribbing to the top of the piece? [y/n]:
```
___
<a id="knitify18"></a>**18.** Enter a name for the output knitout file. The file with be saved to the [knit-out-files](knit-out-files) folder.
```console
Save as:
```
*e.g. `stars.k`*
___

<mark><a id="shapeify"></a><ins>**Shapeify**</ins></mark>

<table>
<tr>
<td>Shape code specs:</td>
<td><a href="#shapeify1">1) Shape</a></td><td><a href="#shapeify1a">1.a) Image file</a></td><td><a href="#shapeify1b">1.b) Colorwork knitout file</a></td><td><a href="#shapeify1c">1.c) Alter the shape code</a></td>
</tr>
<tr>
<td>Save:</td>
<td><a href="#shapeify2">2) Save as</a></td>
</tr>
<tr>
<td>Shaping specs:</td>
<td><a href="#shapeify3">3) Increasing method</a></td><td><a href="#shapeify4">4) Transfer speed</a></td>
</tr>
</table>

<a id="shapeify1"></a>**1.** To determine the shaping to apply to the colorwork file you produced, you can choose to either use a custom shape image (represented by a black graphic [.jpg or .png] with a white background) that you've placed in the [in-shape-images](in-shape-images) folder, or to base the shaping off of a pre-made template.  \
**NOTE: option `[2] Template` is still in progress. Please use only option `[1] Custom Shape` for now.**
```console
[1] Custom Shape
[2] Template
[0] CANCEL
^Would you like to input an image for a custom shape, or use a pre-made template? [1, 2, 0]:
```
*e.g. `1`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

*if option `[1] Custom Shape` is selected*:
- <a id="shapeify1a"></a>**1.a)** Input the name of the shape graphic file (which should reside in the [in-shape-images](in-shape-images) folder).
```console
  Shape image file:
```
 *e.g. `shape.jpg`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="shapeify1b"></a>**1.b)** Input the name of the colorwork knitout file (which will have been outputted as a rectangular panel by <tt>knitify</tt>) that you'd like to add shaping to.\
  NOTE: only use files produced by knitify; they contain information/structure that is necessary for shapeify to successfully parse and process file.
```console
  What is the name of the file that you would like to add shaping to?
```
  *e.g. `stars.k`*
<hr style="border-top: dotted 3px; color:lightgray; background:transparent" />

  - <a id="shapeify1c"></a>**1.c)** The shape will be processed into a .txt file (titled <tt>SHAPE-CODE.txt</tt>) with '1' characters represented the shape (black graphic) and '0' characters representing the white space (white background). This file is editable, in case the shape doesn't turn out exactly as you'd like (but it must remain only 1s and 0s, the same number of lines, and the same number of characters in each line). Key-in 'y' when you are done editing the file or if you don't want to make any changes.
```console
  WRITING 'SHAPE-CODE.txt' FILE IN WORKING DIRECTORY.
    If you would like to edit the shape in the .txt file, please do so now.
    Valid characters are: 0 [white space] and 1 [shape]
  
  Are you ready to proceed? [y/n]:
```
  *e.g. `y`*
___
<a id="shapeify2"></a>**2.** Enter a name for the output knitout file. The file with be saved to the [knit-out-files](knit-out-files) folder.
```console
Save new file as:
```
*e.g. `stars-shape.k`*
___
*if increasing exists in the shape*:
<a id="shapeify3"></a>**3.** The program is capable of using three different methods of increasing--the first ('xfer') will increase by transfer stitches on the edge to adjacent empty needles and then knitting twisted stitches (different direction than the other stitches in a given pass) on the new empty needles. The second ('twisted-stitch') will simply knit twisted stitches on adjacent empty needles to increase. The third and final method ('split') will increase by splitting (a technique that involves transferring a loop from one needle to another while knitting a new loop on the first needle).
```console
[1] xfer
[2] twisted-stitch
[3] split
[0] CANCEL
^Which increasing method would you like to use? [1, 2, 3, 0]:
```
*e.g. `1`*
___
<a id="shapeify4"></a>**4.** Distinct from the knitting speed, a speed for transfer operations can be specified.
```console
What carriage speed would you like to use for transfer operations? (press enter to use default speed, 100.)
```
*e.g. `200`*
___
## <a id="troubleshooting"></a>Troubleshooting

If you have any trouble, discover a bug, or want to provide feedback, do not hesitate to use the [Issues](https://github.com/gabrielle-ohlson/knitout-image-processing/issues) page.\
For example files, see the [in-colorwork-images](in-colorwork-images) and [in-shape-images](in-shape-images) folders.
## <a id="resources"></a>Additional Resources
Some helpful/relevant resources that you might use or reference alongside this program:
- knitout [specifications](https://github.com/textiles-lab/knitout) and [examples](https://github.com/textiles-lab/knitout-examples) -- the file format produced by this program; created by CMU's [Textiles Lab](https://textiles-lab.github.io/)!
- knitout-kniterate backend [github repo](https://github.com/textiles-lab/knitout-backend-kniterate) and [web version](https://textiles-lab.github.io/knitout-backend-kniterate/) -- for converting knitout files to machine code for the [Kniterate](https://www.kniterate.com/) knitting machine.
- [knitout live visualizer](https://textiles-lab.github.io/knitout-live-visualizer/) -- a *super* helpful resource for visualizing what a knitout file might look like when knitted (great for debugging and knitout-writing practice).
- [knit.work](https://knit.work/) -- a site I worked on with the Textiles Lab that contains a bunch of information/examples/visualizations to help with learning knitout, coding, and machine knitting concepts.