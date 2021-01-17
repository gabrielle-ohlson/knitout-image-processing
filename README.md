# knitout-image-processing

Shaping and colorwork programs to output knitout files based on input images.\
For use in conjunction with a machine-specific knitout backend.

<table>
<tr><td><a href="dependencies"></a></td><td><a href="#installation">Installation</a></td><td><a href="#usage">Usage</a></td><td><a href="#prompts">Command-line Prompts</a></td><td><a href="#troubleshooting">Troubleshooting</a></td></tr>
</table>

## <a name="dependencies"></a>Dependencies

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en/download/)

**Packages to install with npm (package manager included with node.js):**
- [readline-sync](https://www.npmjs.com/package/readline-sync)
- [chalk](https://www.npmjs.com/package/chalk)
- [jimp](https://www.npmjs.com/package/jimp)
- [rgbquant](https://www.npmjs.com/package/rgbquant)

 **NOTE:** ensure that all dependencies have been installed before running the program.

## <a name="installation"></a>Installation

In the command line, type:
```console
git clone https://github.com/gabrielle-ohlson/knitout-image-processing
```
See the github documentation on [cloning a repository](https://docs.github.com/en/free-pro-team@latest/github/creating-cloning-and-archiving-repositories/cloning-a-repository) if you need assistance with installation.

## <a name="usage"></a>Usage

Place the image file (.png or .jpg) that you would like to process in the 'in-colorwork-images' folder.\
From the command-line, cd to the parent directory ('knitout-image-processing') and type 'npm run knitify'.\
Respond to the [prompts](#prompts) as they appear in the terminal.\
When the program has finished running, a knitout file will be written to the sub-directory 'knit-out-files'. A visual depiction of the knitting machine instructions will also be written to the parent directory (under the name 'knit_motif.png').

**To then add shaping to the file:**\
Place an image (.png or .jpg) in the 'in-shape-images' folder. (*note: the graphic should include a white background and a shape with a black outline and fill*.)\
From the command-line, type 'npm run shapeify' and respond to the prompts.\
The program will then output a knitout file to the sub-directory 'knit-out-files'.

## <a name="prompts"></a>Command-line Prompts

<ins>**Knitify**</ins>

```console
Colorwork image file:
```
^1. Enter the name of the image to base the colorwork on (including the extension-- .png or .jpg). The image should exist in the 'in-colorwork-images' folder.\
*e.g. stars.png*
```console
How many stitches wide?
```
^2. The image's width in pixels will be scaled to the number of stitches you'd like the piece to be (not to exceed the maximum needle count of the machine). Enter a number.\
*e.g. 252*
```console
How many rows long? (press enter to scale rows according to img dimensions)
```
^3. The same will occur for the image's height in pixels, in accordance with the row count you specify.\
Note that the knitted piece will likely produce a squashed or stretched version of the image, depending on stitch size and yarn thickness. Scale the image accordingly.\
*e.g. 300*
```console
What model knitting machine will you be using?
```
^4. Enter the company that produces the machine you will be using.\
*e.g. Kniterate*
```console
How many colors would you like to use?
```
^5. The program will reduce the number of colors in the image in accordance with the number you input.\
Keep in mind the maximum number of carriers your machine has.\
*e.g. 5*
```console
Would you like to use dithering? (dithering is recommended for detailed/naturalistic images, but not for graphics/digital artwork.) [y/n]:
```
^6. This determines how the program processes the image--dithering will create the illusion of a more colorful/detailed motif (with adjacent pixels in different colors optically blending to immitate another color). Opting out of this option will produce colors with hard edges. Key-in either 'y' or 'n'.\
*e.g. y*
```console
Would you like to use a predefined palette? [y/n]:
```
^7. This option is useful for when there are certain colors you would like to prioritize in the image, such as when a color is low in occurrence but high in importance. \
*e.g. n*
```console
(OPTIONAL: press enter to skip this step) What would you like to set the stitch number as?
```
^8. Enter a number to set the stitch size (knitout extension: x-stitch-number) in the main body of the piece. For example, on kniterate machines, the number can range between 1 and 9, with lower numbers producing smaller/tighter stitches.\
*e.g. 6*
```console
(OPTIONAL: press enter to skip this step) What would you like to set the carriage speed number as? (valid speeds are between <0-600>)
```
^9. Enter a number to set the knitting speed for the piece (knitout extension: x-speed-number). Faster speeds are more efficient, but may increase the chances of dropped stitches/broken yarn on lower-level machines.\
*e.g. 300*
```console
[1] Default
[2] Birdseye
[3] Minimal
[4] Secure
[0] CANCEL
  ^What style back would you like to use?
  => 'Birdseye' is not recommended for pieces that use more than 3 colors due to the build up of extra rows the method creates on the back bed.
  => Alternatively, 'Minimal' creates a reasonably even ratio of front to back rows, resulting in the least amount of build up on the back.
  => 'Default' is an in-between option that is similar to Birdseye, but more suitable for pieces containing up to 5 colors.
  => 'Secure' is the 'Minimal' option, with additional knits on the side needles for extra security. [1...4 / 0]:
```
^10. Key-in select the style that you'd like the program to produce for the back of the knit.\
*e.g. 1*
```console
Would you like to add rib? [y/n]:

  Would you like to add ribbing to the bottom of the piece? [y/n]:
    
    [1] #hexcode1
    [2] #hexcode2
    [3] #hexcode3 (...continued for # of colors)
    [0] CANCEL
    ^Which carrier would you like to use for the bottom rib? (the corresponding hex code is listed next to each carrier number) [1, 2, 3, 0]:

    How many rows?

  Would you like to add ribbing to the top of the piece? [y/n]:
```
^11. Option to add 1x1 ribbing to the top and/or the bottom of the knit.\
*e.g. y\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[2]\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;30\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;n*
```console
Save as:
```
^12. Enter a name for the output knitout file. The file with be saved to the 'knit-out-files' folder.\
*e.g. stars.k*

<ins>**Shapeify**</ins>

```console
[1] Custom Shape
[2] Template
[0] CANCEL
^Would you like to input an image for a custom shape, or use a pre-made template? [1, 2, 0]:
```
^1. To determine the shaping to apply to the colorwork file you produced, you can choose to either use a custom shape image (represented by a black graphic [.jpg or .png] with a white background) that you've placed in the 'in-shape-images' folder, or to base the shaping off of a pre-made template.  \
**NOTE: option [2] 'Template' is still in progress. Please use only option [1] for now.**\
*e.g. [1]*

*if option [1] 'Custom Shape' is selected*:
```console
  Shape image file:
  
  What is the name of the file that you would like to add shaping to?

  WRITING 'SHAPE-CODE.txt' FILE IN WORKING DIRECTORY.
    If you would like to edit the shape in the .txt file, please do so now.
    Valid characters are: 0 [white space] and 1 [shape]
  
  Are you ready to proceed? [y/n]:
```
1.a) Enter the name of the shape graphic file, followed by the name of the colorwork knitout file (which will have been outputed as a rectangular panel) to add shaping to.\
*You can think of the shape graphic as a cookie cutter that cuts the given shape out of the colorwork file.*\
The shape will be processed into a .txt file with '1' characters represented the shape (black graphic) and '0' characters representing the white space (white background). This file is editable, in case the shape doesn't turn out exactly as you'd like (but it must remain only 1s and 0s, the same number of lines, and the same number of characters in each line). Key-in 'y' when you are done editing the file or if you don't want to make any changes.\
*e.g. sleeve.jpg\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; stars.k\
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;y*
```console
Save new file as:
```
^2. Enter a name for the output knitout file. The file with be saved to the 'knit-out-files' folder.\
*e.g. stars-shape.k*
```console
Does the machine you are using have sinkers? (If you are using a kniterate machine, the answer is no [enter 'n']. Otherwise, the answer is likely yes [enter 'y'], but you should double-check to ensure no damage is done to your machine during short-rowing.) [y/n]:
```
^3. Whether the machine has sinkers or not determines the method of short-rowing that the program will use.  \
*e.g. n*

*if increasing exists in the shape*:
```console
[1] Xfer
[2] Twisted-stitch
[0] CANCEL\
^Which increasing method would you like to use? [1, 2, 0]:
```
^4. The program is capable of using two different methods of increasing--the first ('Xfer') being for transferring stitches on the edge to adjacent empty needles and then knitting twisted stitches (different direction than the other stitches in a given pass) on the new empty needles, and the second ('Twisted-stitch) being for simply knitting twisted stitches on adjacent empty needles.\
*e.g. [1]*
```console
What carriage speed would you like to use for transfer operations? (press enter to use default speed, 100.)
```
^5. Distinct from the knitting speed, a speed for transfer operations can be specified.\
*e.g. 200*
## <a name="troubleshooting"></a>Troubleshooting

If you have any trouble, discover a bug, or want to provide feedback, do not hesitate to use the [Issues](https://github.com/gabrielle-ohlson/knitout-image-processing/issues) page.\
For example files, see the [in-colorwork-images](in-colorwork-images) and [in-shape-images](in-shape-images) folders.