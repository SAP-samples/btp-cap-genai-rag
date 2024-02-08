using {cuid} from '@sap/cds/common';

context sample.db {

      entity Documents : cuid {
            text      : String;
            embedding : Vector(1536);
      }
}
