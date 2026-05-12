// Kickoff times in UTC for all 72 group stage matches
export const GROUP_SCHEDULE: Record<string, string> = {
  'A-m1': '2026-06-11T19:00:00Z', 'A-m2': '2026-06-12T02:00:00Z',
  'A-m3': '2026-06-18T16:00:00Z', 'A-m4': '2026-06-19T01:00:00Z',
  'A-m5': '2026-06-25T01:00:00Z', 'A-m6': '2026-06-25T01:00:00Z',

  'B-m1': '2026-06-12T19:00:00Z', 'B-m2': '2026-06-13T19:00:00Z',
  'B-m3': '2026-06-18T19:00:00Z', 'B-m4': '2026-06-18T22:00:00Z',
  'B-m5': '2026-06-24T19:00:00Z', 'B-m6': '2026-06-24T19:00:00Z',

  'C-m1': '2026-06-13T22:00:00Z', 'C-m2': '2026-06-14T01:00:00Z',
  'C-m3': '2026-06-20T01:00:00Z', 'C-m4': '2026-06-19T22:00:00Z',
  'C-m5': '2026-06-24T22:00:00Z', 'C-m6': '2026-06-24T22:00:00Z',

  'D-m1': '2026-06-13T01:00:00Z', 'D-m2': '2026-06-14T04:00:00Z',
  'D-m3': '2026-06-19T19:00:00Z', 'D-m4': '2026-06-20T04:00:00Z',
  'D-m5': '2026-06-26T02:00:00Z', 'D-m6': '2026-06-26T02:00:00Z',

  'E-m1': '2026-06-14T17:00:00Z', 'E-m2': '2026-06-14T23:00:00Z',
  'E-m3': '2026-06-20T20:00:00Z', 'E-m4': '2026-06-21T00:00:00Z',
  'E-m5': '2026-06-25T20:00:00Z', 'E-m6': '2026-06-25T20:00:00Z',

  'F-m1': '2026-06-14T20:00:00Z', 'F-m2': '2026-06-15T02:00:00Z',
  'F-m3': '2026-06-20T17:00:00Z', 'F-m4': '2026-06-21T04:00:00Z',
  'F-m5': '2026-06-25T23:00:00Z', 'F-m6': '2026-06-25T23:00:00Z',

  'G-m1': '2026-06-15T19:00:00Z', 'G-m2': '2026-06-16T01:00:00Z',
  'G-m3': '2026-06-21T19:00:00Z', 'G-m4': '2026-06-22T01:00:00Z',
  'G-m5': '2026-06-27T03:00:00Z', 'G-m6': '2026-06-27T03:00:00Z',

  'H-m1': '2026-06-15T16:00:00Z', 'H-m2': '2026-06-15T22:00:00Z',
  'H-m3': '2026-06-21T16:00:00Z', 'H-m4': '2026-06-21T22:00:00Z',
  'H-m5': '2026-06-27T00:00:00Z', 'H-m6': '2026-06-27T00:00:00Z',

  'I-m1': '2026-06-16T19:00:00Z', 'I-m2': '2026-06-16T22:00:00Z',
  'I-m3': '2026-06-22T21:00:00Z', 'I-m4': '2026-06-23T00:00:00Z',
  'I-m5': '2026-06-26T19:00:00Z', 'I-m6': '2026-06-26T19:00:00Z',

  'J-m1': '2026-06-17T01:00:00Z', 'J-m2': '2026-06-17T04:00:00Z',
  'J-m3': '2026-06-22T17:00:00Z', 'J-m4': '2026-06-23T03:00:00Z',
  'J-m5': '2026-06-27T02:00:00Z', 'J-m6': '2026-06-27T02:00:00Z',

  'K-m1': '2026-06-17T17:00:00Z', 'K-m2': '2026-06-18T02:00:00Z',
  'K-m3': '2026-06-23T17:00:00Z', 'K-m4': '2026-06-24T02:00:00Z',
  'K-m5': '2026-06-27T23:30:00Z', 'K-m6': '2026-06-27T23:30:00Z',

  'L-m1': '2026-06-17T20:00:00Z', 'L-m2': '2026-06-17T23:00:00Z',
  'L-m3': '2026-06-23T20:00:00Z', 'L-m4': '2026-06-23T23:00:00Z',
  'L-m5': '2026-06-27T21:00:00Z', 'L-m6': '2026-06-27T21:00:00Z',
};

// Display names for each match (home vs away), matching the app's team names
export const MATCH_TEAMS: Record<string, { home: string; away: string }> = {
  'A-m1': { home: 'Mexico',        away: 'South Africa'       },
  'A-m2': { home: 'South Korea',   away: 'Czechia'            },
  'A-m3': { home: 'Czechia',       away: 'South Africa'       },
  'A-m4': { home: 'Mexico',        away: 'South Korea'        },
  'A-m5': { home: 'Czechia',       away: 'Mexico'             },
  'A-m6': { home: 'South Africa',  away: 'South Korea'        },

  'B-m1': { home: 'Canada',              away: 'Bosnia-Herzegovina' },
  'B-m2': { home: 'Qatar',               away: 'Switzerland'        },
  'B-m3': { home: 'Switzerland',         away: 'Bosnia-Herzegovina' },
  'B-m4': { home: 'Canada',              away: 'Qatar'              },
  'B-m5': { home: 'Switzerland',         away: 'Canada'             },
  'B-m6': { home: 'Bosnia-Herzegovina',  away: 'Qatar'              },

  'C-m1': { home: 'Brazil',   away: 'Morocco'  },
  'C-m2': { home: 'Haiti',    away: 'Scotland' },
  'C-m3': { home: 'Brazil',   away: 'Haiti'    },
  'C-m4': { home: 'Morocco',  away: 'Scotland' },
  'C-m5': { home: 'Brazil',   away: 'Scotland' },
  'C-m6': { home: 'Morocco',  away: 'Haiti'    },

  'D-m1': { home: 'United States', away: 'Paraguay'   },
  'D-m2': { home: 'Australia',     away: 'Türkiye'    },
  'D-m3': { home: 'United States', away: 'Australia'  },
  'D-m4': { home: 'Paraguay',      away: 'Türkiye'    },
  'D-m5': { home: 'United States', away: 'Türkiye'    },
  'D-m6': { home: 'Paraguay',      away: 'Australia'  },

  'E-m1': { home: 'Germany',        away: 'Curaçao'        },
  'E-m2': { home: "Côte d'Ivoire",  away: 'Ecuador'        },
  'E-m3': { home: 'Germany',        away: "Côte d'Ivoire"  },
  'E-m4': { home: 'Ecuador',        away: 'Curaçao'        },
  'E-m5': { home: 'Ecuador',        away: 'Germany'        },
  'E-m6': { home: 'Curaçao',        away: "Côte d'Ivoire"  },

  'F-m1': { home: 'Netherlands', away: 'Japan'       },
  'F-m2': { home: 'Sweden',      away: 'Tunisia'     },
  'F-m3': { home: 'Netherlands', away: 'Sweden'      },
  'F-m4': { home: 'Japan',       away: 'Tunisia'     },
  'F-m5': { home: 'Netherlands', away: 'Tunisia'     },
  'F-m6': { home: 'Japan',       away: 'Sweden'      },

  'G-m1': { home: 'Belgium',     away: 'Egypt'        },
  'G-m2': { home: 'Iran',        away: 'New Zealand'  },
  'G-m3': { home: 'Belgium',     away: 'Iran'         },
  'G-m4': { home: 'Egypt',       away: 'New Zealand'  },
  'G-m5': { home: 'Belgium',     away: 'New Zealand'  },
  'G-m6': { home: 'Egypt',       away: 'Iran'         },

  'H-m1': { home: 'Spain',        away: 'Cape Verde'    },
  'H-m2': { home: 'Saudi Arabia', away: 'Uruguay'       },
  'H-m3': { home: 'Spain',        away: 'Saudi Arabia'  },
  'H-m4': { home: 'Cape Verde',   away: 'Uruguay'       },
  'H-m5': { home: 'Spain',        away: 'Uruguay'       },
  'H-m6': { home: 'Cape Verde',   away: 'Saudi Arabia'  },

  'I-m1': { home: 'France',  away: 'Senegal' },
  'I-m2': { home: 'Iraq',    away: 'Norway'  },
  'I-m3': { home: 'France',  away: 'Iraq'    },
  'I-m4': { home: 'Senegal', away: 'Norway'  },
  'I-m5': { home: 'France',  away: 'Norway'  },
  'I-m6': { home: 'Senegal', away: 'Iraq'    },

  'J-m1': { home: 'Argentina', away: 'Algeria'   },
  'J-m2': { home: 'Austria',   away: 'Jordan'    },
  'J-m3': { home: 'Argentina', away: 'Austria'   },
  'J-m4': { home: 'Algeria',   away: 'Jordan'    },
  'J-m5': { home: 'Argentina', away: 'Jordan'    },
  'J-m6': { home: 'Algeria',   away: 'Austria'   },

  'K-m1': { home: 'Portugal',    away: 'DR Congo'    },
  'K-m2': { home: 'Uzbekistan',  away: 'Colombia'    },
  'K-m3': { home: 'Portugal',    away: 'Uzbekistan'  },
  'K-m4': { home: 'DR Congo',    away: 'Colombia'    },
  'K-m5': { home: 'Portugal',    away: 'Colombia'    },
  'K-m6': { home: 'DR Congo',    away: 'Uzbekistan'  },

  'L-m1': { home: 'England',  away: 'Croatia' },
  'L-m2': { home: 'Ghana',    away: 'Panama'  },
  'L-m3': { home: 'England',  away: 'Ghana'   },
  'L-m4': { home: 'Croatia',  away: 'Panama'  },
  'L-m5': { home: 'England',  away: 'Panama'  },
  'L-m6': { home: 'Croatia',  away: 'Ghana'   },
};
