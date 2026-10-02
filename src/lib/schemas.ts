/**
 * Zod schemas for runtime validation of API responses
 */
import { z } from 'zod';

// The Galaxy Store serializes almost every scalar as a string, and uses both
// `null` and `""` for missing values.
const str = z.string().nullish();

/**
 * A single review from `/api/commentList` (also embedded in `/api/detail`)
 */
export const commentSchema = z
  .object({
    modifyDate: str,
    createDate: str,
    loginId: str,
    commentText: str,
    sellerAnswerFlag: str,
    ratingValueNumber: str,
  })
  .passthrough();

export type Comment = z.infer<typeof commentSchema>;

export const commentListResponseSchema = z.object({
  commentList: z.array(commentSchema).nullish(),
});

export type CommentListResponse = z.infer<typeof commentListResponseSchema>;

/**
 * An app entry in a curated list on the detail page
 */
export const curatedAppSchema = z
  .object({
    contentId: str,
    appId: str,
    iconURL: str,
    contentName: str,
    sellerName: str,
    localPrice: str,
    freeFlag: str,
    ratingValue: str,
    ratingNumber: str,
  })
  .passthrough();

export type CuratedApp = z.infer<typeof curatedAppSchema>;

export const detailMainSchema = z
  .object({
    appId: str,
    contentId: str,
    contentName: str,
    contentType: str,
    shortDescription: str,
    contentDescription: str,
    contentNewDescription: str,
    cnvrnImgUrl: str,
    youtubeUrl: str,
    youtubeImgUrl: str,
    itemPurchaseFlag: str,
    sellerName: str,
    copyrightHolder: str,
    sellerId: str,
    iconURL: str,
    contentImgURL: str,
    localPrice: str,
    discountPrice: str,
    discountFlag: str,
    freeFlag: str,
    currencyUnit: str,
    limitAgeCd: str,
    limitAgeDetail: str,
    ratingValue: str,
    ratingNumber: str,
    commentListTotalCount: str,
    starSum: str,
    contentBinaryVersion: str,
    contentBinarySize: str,
    contentBinaryWatchType: str,
    customerSupportEmail: str,
    sellerPrivatePolicy: str,
    sellerSite: str,
    developerSite: str,
    countryCode: str,
    modifyDate: str,
    generalCategoryId: str,
    generalCategoryName: str,
    categoryPath: str,
    deeplinkUrl: str,
    permissionList: z.array(z.unknown()).nullish(),
    dataSafetyCollected: str,
    dataSafetyShared: str,
    curatedTodayAppsRcuID: str,
    curatedTodayAppsTitle: str,
    curatedTogetherAppsRcuID: str,
    curatedTogetherAppsTitle: str,
    curatedSimilarAppsRcuID: str,
    curatedSimilarAppsTitle: str,
    curatedComponentList: z.record(z.string(), z.array(curatedAppSchema)).nullish(),
  })
  .passthrough();

export const sellerInfoSchema = z
  .object({
    sellerTradeName: str,
    representation: str,
    sellerSite: str,
    sellerNumber: str,
    firstSellerAddress: str,
    secondSellerAddress: str,
    registrationNumber: str,
    reportNumber: str,
  })
  .passthrough();

export const screenshotSchema = z
  .object({
    scrnShtUrlList: z
      .array(
        z.object({
          smallScrnShtUrl: str,
          originalScrnShtUrl: str,
        })
      )
      .nullish(),
  })
  .passthrough();

/**
 * `/api/detail/{appId}` response schema
 */
export const detailResponseSchema = z
  .object({
    appId: str,
    contentId: str,
    DetailMain: detailMainSchema,
    SellerInfo: sellerInfoSchema.nullish(),
    Screenshot: screenshotSchema.nullish(),
    commentList: z.array(commentSchema).nullish(),
  })
  .passthrough();

export type DetailResponse = z.infer<typeof detailResponseSchema>;

/**
 * Error payload the Galaxy Store returns with HTTP 200, e.g.
 * `{ errCode: "9900", errMsg: "this content is not registered at store" }`
 */
export const errorResponseSchema = z.object({
  errCode: z.string(),
  errMsg: z.string().nullish(),
});
