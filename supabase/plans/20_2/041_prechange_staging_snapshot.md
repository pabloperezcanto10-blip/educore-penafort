# Migration 041 pre-change staging snapshot

Environment: staging `zhnbrpcekmxldxlqrbhr`
Captured before applying migration 041. No personal data is included.

## Recovery method

The local Docker database dump path was unavailable. The snapshot therefore
uses official linked-project catalog queries plus the reproducible rollback in
`041_rollback_staging.sql`. The rollback recreates the exact seven UNIQUE
constraints and standalone UNIQUE index recorded below.

## Legacy objects

| Table | Object | Definition |
| --- | --- | --- |
| `partial_grades` | `partial_grades_unique_assessment_year_idx` | UNIQUE INDEX `(academic_year_id, student_id, subject_id, term, assessment_type, assessment_name)` |
| `evaluation_criteria` | `evaluation_criteria_unique_name_year` | UNIQUE `(academic_year_id, teacher_id, course_id, subject_id, term, name)` |
| `quarter_final_grades` | `quarter_final_grades_unique_student_term_year` | UNIQUE `(academic_year_id, student_id, subject_id, teacher_id, course_id, term)` |
| `term_subject_grades` | `term_subject_grades_unique_student_subject_term_year` | UNIQUE `(academic_year_id, student_id, subject_id, term)` |
| `evaluation_publications` | `evaluation_publications_unique_course_term_year` | UNIQUE `(academic_year_id, course_id, term)` |
| `annual_evaluation_weights` | `annual_weights_unique_year` | UNIQUE `(academic_year_id, teacher_id, course_id, subject_id)` |
| `final_course_grades` | `final_course_grades_unique_year` | UNIQUE `(academic_year_id, student_id, subject_id)` |
| `final_evaluation_publications` | `final_evaluation_publications_unique_course_year` | UNIQUE `(academic_year_id, course_id)` |

## Tenant-aware replacements

The eight replacements were present, UNIQUE, valid and ready:

| Index | Exact column order |
| --- | --- |
| `partial_grades_school_assessment_uidx` | `(school_id, academic_year_id, student_id, subject_id, term, assessment_type, assessment_name)` |
| `evaluation_criteria_school_name_uidx` | `(school_id, academic_year_id, teacher_id, course_id, subject_id, term, name)` |
| `quarter_final_grades_school_term_uidx` | `(school_id, academic_year_id, student_id, subject_id, teacher_id, course_id, term)` |
| `term_subject_grades_school_term_uidx` | `(school_id, academic_year_id, student_id, subject_id, term)` |
| `evaluation_publications_school_term_uidx` | `(school_id, academic_year_id, course_id, term)` |
| `annual_weights_school_uidx` | `(school_id, academic_year_id, teacher_id, course_id, subject_id)` |
| `final_course_grades_school_uidx` | `(school_id, academic_year_id, student_id, subject_id)` |
| `final_publications_school_uidx` | `(school_id, academic_year_id, course_id)` |

Eight additional UNIQUE indexes support compound FKs. Each has exact columns
`(id, school_id)`:

- `partial_grades_id_school_id_uidx`;
- `evaluation_criteria_id_school_id_uidx`;
- `quarter_final_grades_id_school_id_uidx`;
- `term_subject_grades_id_school_id_uidx`;
- `evaluation_publications_id_school_id_uidx`;
- `annual_evaluation_weights_id_school_id_uidx`;
- `final_course_grades_id_school_id_uidx`;
- `final_evaluation_publications_id_school_id_uidx`.

The seven legacy constraints depended only on their PostgreSQL-owned backing
indexes. The standalone partial-grades index had no dependent constraint,
foreign key, function, view, trigger or publication. All 039A compound FKs
depend on the tenant-owned roots or the `(id, school_id)` indexes above, not on
the eight removed legacy objects.

## Structural fingerprints

| Inventory | Count | MD5 fingerprint |
| --- | ---: | --- |
| Academic RLS policies | 36 | `2f549ad5ab0fec95c39470bdf4a3f45f` |
| Academic grants | 143 | `ba42919f3225c8fdefcaf0c890cf677f` |
| Academic triggers | 21 | `ca633272da8f584966779b2e2c8bf46b` |
| Applied migrations | 40 (latest `040`) | `5cf2162da9cac47160637c49cfb6e031` |

The original backup query above serialized complete catalog rows. The compact
postflight uses a deliberately smaller canonical serialization and records the
equivalent policy, grant and trigger fingerprints as
`54d744d57103f02bed4fc9ca8afe8ae9`,
`4c115015d47b3728794e976ce3ea9188` and
`2df212e0d37809a32bb782db81856f6c`. Counts and definitions are unchanged; the
different hashes are caused only by the different serialization formula.

All eight target tables contained zero rows at capture time. Each ordered row
fingerprint was therefore `d41d8cd98f00b204e9800998ecf8427e`.

The catalog query also captured all 24 non-primary unique definitions and
their individual hashes. Migration 041 and the manual rollback use the exact
definitions above; the postflight rechecks the structural inventory and row
fingerprints.
