(Ten plik jest tylko informacją dla developera)

Aby logo restauracji wyświetlało się w raportach JasperReports:

1. Skopiuj plik logo.jpg do katalogu:
   backend/src/main/resources/img/logo.jpg

2. W pliku .jrxml ścieżka do logo powinna być:
   <imageExpression><![CDATA["img/logo.jpg"]]></imageExpression>

Po zbudowaniu projektu Maven plik logo będzie dostępny w classpath i JasperReports go znajdzie.

Jeśli katalog img/ nie istnieje, utwórz go w resources.
