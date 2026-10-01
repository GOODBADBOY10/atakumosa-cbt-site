"use client";

import { useState } from "react";

const HISTORY_SECTIONS: { heading?: string; paragraphs: string[] }[] = [
    {
        paragraphs: [
            `An attempt to write the history of Atakunmosa High School, Osu demands some historical excursions on educational advocacy in Ijesaland. It also requires a bit of connectional overview on the cosmological presentation of Ijesas as a people.`,
            `The nationalistic instinct permeating the social milieu of every corner of Yorubaland had its positive impact in Ijesaland more than before in the 1960s, most especially at the immediate years of Nigerian Independence from colonial rule. By 1934, Ijesaland succeeded in having its first secondary school — Ilesa Grammar School, Ilesa — by dint of hard work, foresight and commitment.`,
            `By geographical classification, Ijesaland was partitioned into Urban, Northern and Southern Districts. The Southern District housed the likes of Osu, Okebode, Iwaro, Iperindo, Ifewara, Iwara, Igangan, Ibodi, Itagunmodi, Ipole, Illa, Muroko, Iginla, Epe, Igun, Igbadae and a host of other villages.`,
        ],
    },
    {
        heading: "The Connectional Link of Egbe-Atunluse of Ijesaland",
        paragraphs: [
            `The Egbe-Atunluse of Ijesaland was socially powerful and politically influential in her irredentist movement of the era. Many Ijesa sons privileged to have western education pulled themselves into a socio-cultural pressure group.`,
            `The hot appetite of the Egbe in educational spheres led to the establishment of Ilesa Grammar School. As its impact spread through Ijesaland, members of the Egbe-Atunluse from the Northern and Southern Districts began agitating for secondary schools of their own. The North succeeded first — Ijebu-Ijesa Grammar School (1955), Imesi-Ile High School (1956), and Ipetu-Ijesa Grammar School followed.`,
            `The Egbe-Atunluse members from the Southern axis were not comfortable, as despite their intimate affiliation with Ilesa, there was no secondary school in their own root — the Ijesa Southern District.`,
        ],
    },
    {
        heading: "Atakunmosa High School at Conception",
        paragraphs: [
            `The likes of Late Kabiyesi Owa Peter A. Agunlejika, Pa Ayoola, Pa Peter Obadare Famogbiyele, Loja Omolade Adeyokunu, Chief Emmanuel O. Fajuyitan, Prince Ade Ajayi (of Ipole-Ijesa), Canon J. O. Akinyemi and many others started a great move to see that a secondary school was established in Ijesa Southern District. Their efforts led to the establishment of Atakunmosa High School, Osu in January 1963.`,
            `Unlike early secondary schools in Ijesa Northern District, which were named after their host communities, the founders of this school — from several separate towns in Ijesa South — settled for a unifying name: ATAKUNMOSA, after Kabiyesi Owa Atakunmosa, the 7th Owa Obokun of Ijesaland, who reigned around 1600 AD and whose era witnessed notable socio-political and economic advancement.`,
        ],
    },
    {
        heading: "The Location of Atakunmosa High School",
        paragraphs: [
            `Osu was the only town along a major trunk A road among the relatively big communities from where the founding elites came, and was also considered geographically central among the towns in Ijesa Southern District.`,
            `The school's logo reflects this collective origin: the letter 'I' (for Ijesaland) is artistically superimposed on the letter 'S' (for Southern District), symbolizing that the school was a collective initiative of Ijesa Southern District's intelligentsia and patriots of the era.`,
        ],
    },
    {
        heading: "In the Beginning",
        paragraphs: [
            `Osu community provided the initial buildings for the school's commencement — a disused block of three classrooms, an extension of the existing Methodist Primary School, Oke-Oja, Osu, adjacent to the then Local Government Police Station.`,
            `The school was conceived as a boarding and co-educational institution from inception. A deep-well was constructed to provide clean water, the Police station provided aerial security coverage, and a football pitch stood close by to develop students' physical agility.`,
            `Barrister (later Hon. Justice) Joseph Olatunji Ogunbiyi laid the foundation for construction at the Permanent Site in early 1963, while Chairman of the Ijesa Southern District Council. Academic activities began on the permanent site in the second half of 1963. The land was donated for free by a collective of Osu families, understood to include the Ojotunkesi family.`,
        ],
    },
    {
        heading: "Strategy for Sourcing Students",
        paragraphs: [
            `The founders personally sourced the first set of students — many withdrew their own children or wards from existing schools to form the foundation class, as a demonstration of personal commitment and public trust in the new school.`,
            `The first 16 premier students enrolled on January 18, 1963 included Col. Gabriel Ajayi (Admission No. 001), Amuda S. Lawal (first Head Boy), and Ajifowobaje Bimpe (first Head Girl). By 1964, many more students completing Secondary Modern school joined Class II, bringing the founding cohort to 40 students in total.`,
            `The first set graduated in 1968 — a class that included future community leaders, health officers, and the renowned actor Late Victor Olaotan (Akapo), who went on to become an icon of Nigerian film and television.`,
        ],
    },
    {
        heading: "Board, Management & Principals",
        paragraphs: [
            `The school's early Board of Governors was chaired at various times by Pa J. O. Famogbiyele, Chief Emmanuel Fajuyitan, and Loja Omolade Adeyokunu, among others.`,
            `The founding Principal was Mr. (later Hon. Chief) C. O. Komolafe, who started the school on January 18, 1963 with a single teacher, Mr. Asaolu, before resigning in March 1963 to make way for a Principal who could give full-time attention to the growing school.`,
            `He was followed by Mr. J. O. Fagbule (1963–1966), who oversaw the move to the permanent site, and then Chief Adebayo Adefarati (1967–1975), under whom the school is widely regarded to have attained the apogee of her greatness — building science laboratories, hostels, staff quarters, a library, additional academic blocks, and a standard football pitch.`,
            `Subsequent Principals included Chief S. A. Akinyemi, Rev'd D. O. Olayinka, Mr. O. Agunbiade, Mr. 'Bode Ogundunsin, Late Mr. K. J. Alaka, Prince A. S. Ladesuyi, Pastor J. O. Adurodolorun, Prince Ademola Adeyoju (the school's first Old Student Principal), Pastor S. A. Adepoju, Mr. I. A. Adeniyi, and Mr. M. S. Folorunso — each contributing to the school's infrastructural, academic, and disciplinary development across the decades.`,
            `The school is currently led by Comrade Olumide Olugbemi Odedele, who assumed office in December 2024.`,
        ],
    },
    {
        heading: "Academic, Sports & Social Development",
        paragraphs: [
            `Between 1967 and 1975, the school enjoyed a glowing era of academic, sporting, literary and debating excellence. The Sport Houses — Arimoro, Obokun, Ogedengbe and Atakunmosa, named after Ijesa legendary leaders — competed actively, and the school football team famously qualified second in the Western State's Principal's Cup in 1974.`,
            `The school magazine, "The Hero", was inaugurated to foster literary talent, and the Dramatic & Cultural Society participated in FESTAC 1977. The school's Heroes' Band was equipped to rival the best musicians of the era.`,
        ],
    },
    {
        heading: "Conclusion",
        paragraphs: [
            `In over 60 years, Atakunmosa High School, Osu has lived up to the expectation of her founding fathers, setting her motto from the outset: "KO NI AFARAWE — NULLI SECUNDUS" — to be first among equals.`,
            `The school continues to produce students of high academic and moral excellence, and the National Old Students' Association remains committed to restoring and building upon the glory of the past.`,
        ],
    },
];

export function HistorySection() {
    const [expanded, setExpanded] = useState(false);

    return (
        <section id="history" className="max-w-4xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-bold mb-4">Our History</h2>
            <p className="text-gray-600 leading-relaxed mb-2">
                Atakunmosa High School, Osu was founded in January 1963 by a coalition
                of patriots and elites from across Ijesa Southern District, who
                united behind the name of Kabiyesi Owa Atakunmosa — the celebrated
                7th Owa Obokun of Ijesaland. From a borrowed block of three
                classrooms, the school grew into one of the most storied secondary
                schools in Ijesaland, guided by the motto{" "}
                <span className="italic">"Ko ni afarawe — Nulli Secundus."</span>
            </p>

            {!expanded && (
                <button
                    onClick={() => setExpanded(true)}
                    className="text-blue-700 font-medium text-sm hover:underline mt-2"
                >
                    Read the full history →
                </button>
            )}

            {expanded && (
                <div className="mt-6 space-y-6">
                    {HISTORY_SECTIONS.map((section, i) => (
                        <div key={i}>
                            {section.heading && (
                                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                                    {section.heading}
                                </h3>
                            )}
                            {section.paragraphs.map((p, j) => (
                                <p key={j} className="text-gray-600 leading-relaxed text-sm mb-3">
                                    {p}
                                </p>
                            ))}
                        </div>
                    ))}

                    <button
                        onClick={() => setExpanded(false)}
                        className="text-blue-700 font-medium text-sm hover:underline"
                    >
                        ← Show less
                    </button>
                </div>
            )}
        </section>
    );
}