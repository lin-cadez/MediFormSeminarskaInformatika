rm -f Naloga.{aux,bbl,bcf,blg,log,out,run.xml,toc,lof}
pdflatex Naloga.tex && \
/usr/bin/vendor_perl/biber Naloga && \
pdflatex Naloga.tex && \
/usr/bin/vendor_perl/biber Naloga && \
pdflatex Naloga.tex && \
pdflatex Naloga.tex
rm -f Naloga.{aux,bbl,bcf,blg,log,out,run.xml,toc,lof}